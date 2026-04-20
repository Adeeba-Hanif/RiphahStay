import axios from "axios";

async function messageFromBlob(blob) {
    const text = await blob.text();
    try {
        const j = JSON.parse(text);
        return j.message || text.slice(0, 300);
    } catch {
        return text.slice(0, 300) || "Failed to download PDF";
    }
}

/**
 * Downloads a challan PDF from GET /challan/:id/pdf and triggers a browser save.
 * Surfaces JSON error bodies when the server returns an error with responseType blob.
 */
export async function downloadChallanPdf({ apiBase, challanId, filename, axiosConfig = {} }) {
    const url = `${apiBase}/challan/${challanId}/pdf`;
    try {
        const res = await axios.get(url, { ...axiosConfig, responseType: "blob" });
        const ct = (res.headers["content-type"] || "").toLowerCase();
        if (ct.includes("application/json")) {
            throw new Error(await messageFromBlob(res.data));
        }
        const blob =
            res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(href);
    } catch (err) {
        let msg = "Failed to download PDF";
        if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
            msg = await messageFromBlob(err.response.data);
        } else if (err?.response?.data?.message) {
            msg = err.response.data.message;
        } else if (err?.message) {
            msg = err.message;
        }
        throw new Error(msg);
    }
}
