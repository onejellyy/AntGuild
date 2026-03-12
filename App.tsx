import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import * as NavigationBar from 'expo-navigation-bar';
import { configureGoogleSignIn } from './src/services/auth';

const GOOGLE_WEB_CLIENT_ID = '1091141517798-20jhgchjt21hkgg3c1f59bsvcn34co5q.apps.googleusercontent.com';
configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);

import LoadingScreen from './src/screens/LoadingScreen';
import StartScreen from './src/screens/StartScreen';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import TradesScreen from './src/screens/TradesScreen';
import HoldingsScreen from './src/screens/HoldingsScreen';
import RankingScreen from './src/screens/RankingScreen';
import AntGroupScreen from './src/screens/AntGroupScreen';
import MoreScreen from './src/screens/MoreScreen';
import QuoteContentScreen from './src/screens/QuoteContentScreen';
import InvestmentTipContentScreen from './src/screens/InvestmentTipContentScreen';
import IPOChallengeScreen from './src/screens/IPOChallengeScreen';
import StartInvestingScreen from './src/screens/StartInvestingScreen';
import AffiliateProductsScreen from './src/screens/AffiliateProductsScreen';
import EditTradeScreen from './src/screens/EditTradeScreen';
import CustomTabBar from './src/components/CustomTabBar';
import { COLORS } from './src/constants/theme';
import { TradeEntry } from './src/services/storage/types';

export type RootStackParamList = {
  Loading: undefined;
  Start: undefined;
  Login: undefined;
  MainTabs: undefined;
  EditTrade: { entry: TradeEntry };
  QuoteContent: undefined;
  InvestmentTipContent: undefined;
  IPOChallenge: undefined;
  StartInvesting: undefined;
  AffiliateProducts: undefined;
};

export type TabParamList = {
  Main: undefined;
  Trades: undefined;
  Holdings: undefined;
  Ranking: undefined;
  AntGroup: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Main"
    >
      <Tab.Screen name="Main" component={MainScreen} />
      <Tab.Screen name="Trades" component={TradesScreen} />
      <Tab.Screen name="Holdings" component={HoldingsScreen} />
      <Tab.Screen name="Ranking" component={RankingScreen} />
      <Tab.Screen name="AntGroup" component={AntGroupScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_700Bold, Manrope_800ExtraBold });

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Loading"
          screenOptions={{ headerShown: false, animation: 'fade' }}
        >
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Start" component={StartScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="EditTrade"
            component={EditTradeScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="QuoteContent"
            component={QuoteContentScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="InvestmentTipContent"
            component={InvestmentTipContentScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="IPOChallenge"
            component={IPOChallengeScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="StartInvesting"
            component={StartInvestingScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AffiliateProducts"
            component={AffiliateProductsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
