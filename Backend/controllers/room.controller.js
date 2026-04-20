import { Room, RoomRequest } from "../models/room.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Challan } from "../models/challan.model.js";
import { createChallanInternal } from "../utils/createChallanInternal.js";
import { DEFAULT_ROOM_RENT_PKR } from "../config/finance.js";

export const getRooms = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const rooms = await Room.find(filter)
            .populate("occupants", "fullName email")
            .populate("wifiPoint", "name type");

        return res.status(200).json(rooms);
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return res.status(500).json({ message: "Failed to fetch rooms" });
    }
};

export const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;

        const room = await Room.findById(id)
            .populate("occupants", "fullName email")
            .populate("wifiPoint", "name type");

        if (!room) return res.status(404).json({ message: "Room not found" });

        return res.status(200).json(room);
    } catch (error) {
        console.error("Error fetching room:", error);
        return res.status(500).json({ message: "Failed to fetch room" });
    }
};

export const getMyPendingRequest = async (req, res) => {
    try {
        const request = await RoomRequest.findOne({
            student: req.user.id,
            status: "pending",
        }).populate("toRoom", "level roomNumber capacity");
        return res.status(200).json({ request: request || null });
    } catch (error) {
        console.error("getMyPendingRequest error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const createRoomRequest = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { toRoom } = req.body;

        const existingPending = await RoomRequest.findOne({
            student: studentId,
            status: "pending",
        });
        if (existingPending) {
            return res
                .status(400)
                .json({ message: "You already have a pending room request." });
        }

        const user = await User.findById(studentId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const targetRoom = await Room.findById(toRoom);
        if (!targetRoom)
            return res.status(404).json({ message: "Target room not found" });

        const request = await RoomRequest.create({
            student: studentId,
            fromRoom: user.room || null,
            toRoom,
        });

        return res.status(201).json(request);
    } catch (error) {
        console.error("Error creating room request:", error);
        return res.status(500).json({ message: "Failed to create room request" });
    }
};

export const decideRoomRequest = async (req, res) => {
  try {
    const wardenId = req.user.id; // from JWT
    const { id } = req.params;
    const { action, note } = req.body;

    const request = await RoomRequest.findById(id)
      .populate("student")
      .populate("toRoom");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (!request.student) {
      return res.status(400).json({ message: "Student account no longer exists. Please delete this request." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed." });
    }

    // we’ll use this for text
    const toRoomLabel = request.toRoom
      ? `${request.toRoom.level} ${request.toRoom.roomNumber}`
      : "the selected room";

    // 1) reject
    if (action === "reject") {
      request.status = "rejected";
      request.wardenNote = note || "";
      request.decidedBy = wardenId;
      await request.save();

      await Notification.create({
        users: [request.student._id],
        title: "Room change request rejected",
        text:
          note?.trim() ||
          `Your room change request to ${toRoomLabel} was rejected.`,
        actor: wardenId,
        type: "info",
        payload: {
          requestId: request._id,
          toRoom: request.toRoom ? request.toRoom._id : null,
          status: "rejected",
        },
      });

      return res.status(200).json(request);
    }

    // 2) approve
    if (action === "approve") {
      // schema says required, but room might have been deleted later
      if (!request.toRoom) {
        return res.status(400).json({
          message:
            "Target room no longer exists. Please reject this request instead.",
        });
      }

      const targetRoom = await Room.findById(request.toRoom._id).populate(
        "occupants",
        "_id"
      );
      if (!targetRoom) {
        return res.status(404).json({ message: "Target room not found" });
      }

      // capacity check
      if (
        typeof targetRoom.capacity === "number" &&
        targetRoom.occupants.length >= targetRoom.capacity
      ) {
        return res.status(400).json({
          message: "Room is at full capacity. Please reject this request.",
        });
      }

      // move student
      const student = await User.findById(request.student._id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      const oldRoomId = student.room;
      const newRoomId = request.toRoom._id;

      student.room = newRoomId;
      await student.save();

      // remove from old room and update its status to available
      if (oldRoomId) {
        const oldRoom = await Room.findByIdAndUpdate(
          oldRoomId,
          { $pull: { occupants: student._id } },
          { new: true }
        );
        if (oldRoom && oldRoom.status === "booked") {
          await Room.findByIdAndUpdate(oldRoomId, { status: "available" });
        }
      }

      // add to new room and update status to booked if at capacity
      const updatedNewRoom = await Room.findByIdAndUpdate(
        newRoomId,
        { $addToSet: { occupants: student._id } },
        { new: true }
      );
      if (updatedNewRoom && updatedNewRoom.occupants.length >= updatedNewRoom.capacity) {
        await Room.findByIdAndUpdate(newRoomId, { status: "booked" });
      }

      request.status = "approved";
      request.wardenNote = note || "";
      request.decidedBy = wardenId;
      await request.save();

      await Notification.create({
        users: [student._id],
        title: "Room change approved",
        text: `Your room change request has been approved. New room: ${toRoomLabel}.`,
        actor: wardenId,
        type: "info",
        payload: {
          requestId: request._id,
          toRoom: newRoomId,
          status: "approved",
        },
      });

      // ── Auto-generate booking challan ────────────────────────────
      let bookingChallan = null;
      try {
        // Guard: skip if a booking challan already exists for this request
        const alreadyBilled = await Challan.findOne({ bookingRef: request._id });
        if (!alreadyBilled) {
          const now     = new Date();
          const month   = now.toLocaleString("default", { month: "long" }) + " " + now.getFullYear();
          const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

          const room = await Room.findById(newRoomId).lean();
          const roomRent = Number(room?.rent) || DEFAULT_ROOM_RENT_PKR;
          const items = [
            {
              description: `Room Rent – ${room?.level ?? ""}/${room?.roomNumber ?? ""}`,
              amount: roomRent,
            },
            { description: "Wi-Fi (Included)", amount: 0 },
            { description: "Transport (Included)", amount: 0 },
          ];

          bookingChallan = await createChallanInternal({
            student:    student._id,
            month,
            items,
            dueDate,
            createdBy:  wardenId,
            type:       "booking",
            bookingRef: request._id,
          });
        }
      } catch (challanErr) {
        // Non-fatal: log but don't fail the approval
        console.error("booking challan creation error:", challanErr);
      }

      return res.status(200).json({ request, challan: bookingChallan });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error deciding room request:", error);
    return res.status(500).json({ message: "Failed to process room request" });
  }
};


export const listRoomRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const requests = await RoomRequest.find(filter)
            .populate("student", "fullName email")
            .populate("fromRoom", "level roomNumber")
            .populate("toRoom", "level roomNumber")
            .sort({ createdAt: -1 });

        return res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching room requests:", error);
        return res.status(500).json({ message: "Failed to fetch room requests" });
    }
};
