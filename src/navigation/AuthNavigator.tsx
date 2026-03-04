import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashPage from "../pages/SplashPage.js";
import SignupPage from "../pages/SignupPage.js";
import LoginPage from "../pages/LoginPage.js";
import Dashboard from "../pages/Dashboard.js";
import FakeCall from "../pages/FakeCall.js";
import Settings from "../pages/Settings.js";
import Menu from "../pages/Menu.js";
import Profile from "../pages/Profile.js";
import Notifications from "../pages/Notification.js";
import SafetyCompanion from "../pages/SafetyCompanion.js";
import LiveTracking from "../pages/LiveTracking.js";
import ContactsPage from "../pages/ContactsPage.js";
import AboutPage from "../pages/AboutPage.js";
import HelpPage from "../pages/HelpPage.js";
import PrivacySecurityPage from "../pages/PrivacySecurityPage.js";
import LanguagePage from "../pages/LanguagePage.js";

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
  AlertHistory: undefined;
  NearbyHelp: undefined;
  About: undefined;
  Help: undefined;
  PrivacySecurity: undefined;
  Language: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashPage} />
      <Stack.Screen name="Signup" component={SignupPage} />
      <Stack.Screen name="Login" component={LoginPage} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="AlertHistory" component={require('../pages/AlertHistory').default} />
      <Stack.Screen name="NearbyHelp" component={require('../pages/NearbyHelp').default} />
      <Stack.Screen name="FakeCall" component={FakeCall} />
      <Stack.Screen name="Settings" component={Settings}/>
      <Stack.Screen name="Menu" component={Menu} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Notification" component={Notifications} />
      <Stack.Screen name="SafetyCompanion" component={SafetyCompanion} />
      <Stack.Screen name="LiveTracking" component={LiveTracking} />
      <Stack.Screen name="Contacts" component={ContactsPage} />
      <Stack.Screen name="About" component={AboutPage} />
      <Stack.Screen name="Help" component={HelpPage} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityPage} />
      <Stack.Screen name="Language" component={LanguagePage} />
    </Stack.Navigator>
  );
}
