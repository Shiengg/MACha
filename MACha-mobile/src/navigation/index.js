import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import BottomTabNavigator from './BottomTabNavigator';
import SettingsScreen from '../screens/profile/SettingsScreen';
import TermsScreen from '../screens/profile/TermsScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MapScreen from '../screens/map/MapScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import CampaignDetailScreen from '../screens/campaigns/CampaignDetailScreen';
import DonateScreen from '../screens/campaigns/DonateScreen';
import CreateCampaignScreen from '../screens/campaigns/CreateCampaignScreen';
import SearchScreen from '../screens/search/SearchScreen';
import SearchHistoryScreen from '../screens/search/SearchHistoryScreen';
import NotificationScreen from '../screens/notifications/NotificationScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import KYCScreen from '../screens/kyc/KYCScreen';
import PostDetailScreen from '../screens/posts/PostDetailScreen';
import RecoveryCasesScreen from '../screens/creator/RecoveryCasesScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
        <Stack.Screen name="Donate" component={DonateScreen} />
        <Stack.Screen name="CreateCampaign" component={CreateCampaignScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="SearchHistory" component={SearchHistoryScreen} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="KYC" component={KYCScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="RecoveryCases" component={RecoveryCasesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

