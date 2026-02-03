import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashPage from "../pages/SplashPage";
import SignupPage from "../pages/SignupPage";
import LoginPage from "../pages/LoginPage";
import Dashboard from "../pages/Dashboard";
import FakeCall from "../pages/FakeCall";
import Settings from "../pages/Settings";
import Menu from "../pages/Menu";
import Profile from "../pages/Profile";
import Notifications from "../pages/Notification";
import SafetyCompanion from "../pages/SafetyCompanion";
import LiveTracking from "../pages/LiveTracking";
import ContactsPage from "../pages/ContactsPage";

export type AuthStackParamList = {
  Splash: undefined;
  Signup: undefined;
  Login: undefined;
  Dashboard: undefined;
  FakeCall: undefined;
  Settings: undefined;
  Menu: undefined;
  Profile: undefined;
  Notification: undefined;
  SafetyCompanion: undefined;
  LiveTracking: undefined;
  Contacts: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashPage} />
      <Stack.Screen name="Signup" component={SignupPage} />
      <Stack.Screen name="Login" component={LoginPage} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="FakeCall" component={FakeCall} />
      <Stack.Screen name="Settings" component={Settings}/>
      <Stack.Screen name="Menu" component={Menu} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Notification" component={Notifications} />
      <Stack.Screen name="SafetyCompanion" component={SafetyCompanion} />
      <Stack.Screen name="LiveTracking" component={LiveTracking} />
      <Stack.Screen name="Contacts" component={ContactsPage} />

  

    </Stack.Navigator>
  );
}
