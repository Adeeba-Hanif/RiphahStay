import { useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";

import CombinedContextProvider, { useAuthContext } from "./context";
import SplashScreen from "./Screens/SplashScreen";
import GuestExplore from "./Screens/GuestExplore";

// UnAuth screens
import LoginScreen from "./Screens/LoginScreen";
import SignupScreen from "./Screens/Signup";
import ResetPasswordScreen from "./Screens/ResetPassword";
// Auth screens
import Dashboard from "./Screens/Dashboard";
import Attendance from "./Screens/Attendance";
import Profile from "./Screens/Profile";
import RoomAllocation from "./Screens/RoomAllocation";
import NotificationsAlerts from "./Screens/Announcement";
import LeaveLog from "./Screens/LeaveLog";
import NearbyHostels from "./Screens/NearbyHostels";
import TransportManagement from "./Screens/TransportManagement";
import BillingInvoice from "./Screens/BillingInvoice";
import Services from "./Screens/Services";
import ComplaintBox from "./Screens/ComlaintBox";
import Mess from "./Screens/Mess";
import Review from "./Screens/Review";

LogBox.ignoreLogs([
  "VirtualizedLists should never be nested inside plain ScrollViews",
]);

const { Navigator, Screen } = createStackNavigator();

const AuthStack = () => (
  <Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
    <Screen name="Dashboard" component={Dashboard} />
    <Screen name="Profile" component={Profile} />
    <Screen name="Attendance" component={Attendance} />
    <Screen name="NotificationsAlerts" component={NotificationsAlerts} />
    <Screen name="LeaveLog" component={LeaveLog} />
    <Screen name="NearbyHostels" component={NearbyHostels} />
    <Screen name="TransportManagement" component={TransportManagement} />
    <Screen name="RoomAllocation" component={RoomAllocation} />
    <Screen name="BillingInvoice" component={BillingInvoice} />
    <Screen name="Services" component={Services} />
    <Screen name="ComplaintBox" component={ComplaintBox} />
    <Screen name="Mess" component={Mess} />
    <Screen name="Review" component={Review} />
  </Navigator>
)

const UnAuthStack = () => (
  <Navigator initialRouteName='Login' screenOptions={{ headerShown: false }}>
    <Screen name="Login" component={LoginScreen} />
    <Screen name="Signup" component={SignupScreen} />
    <Screen name="ResetPassword" component={ResetPasswordScreen} />
    {/* Guest-accessible screens — no auth required */}
    <Screen name="GuestNearbyHostels" component={NearbyHostels} />
    <Screen name="GuestExplore" component={GuestExplore} />
  </Navigator>
)

const MainNavigator = () => {
  const { token } = useAuthContext();

  return (
    <NavigationContainer>
      {
        token ?
          <AuthStack />
          :
          <UnAuthStack />
      }
    </NavigationContainer>
  )

}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SafeAreaProvider style={{ flex: 1 }}>
        <SplashScreen onFinish={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <CombinedContextProvider>
        <MainNavigator />
      </CombinedContextProvider>
    </SafeAreaProvider>
  );
}

