import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import EventsScreen from '../screens/events/EventsScreen';
import CreateScreen from '../screens/create/CreateScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 5;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;
const INDICATOR_WIDTH = 32;

// Map route names to indices
const routeIndexMap = {
  Feed: 0,
  Discover: 1,
  Events: 2,
  Create: 3,
  Profile: 4,
};

function TabBarIcon({ route, focused, color, size }) {
  let iconName;

  if (route.name === 'Feed') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === 'Discover') {
    iconName = focused ? 'compass' : 'compass-outline';
  } else if (route.name === 'Events') {
    iconName = focused ? 'calendar' : 'calendar-outline';
  } else if (route.name === 'Create') {
    iconName = focused ? 'lightning-bolt' : 'lightning-bolt-outline';
  } else if (route.name === 'Profile') {
    iconName = focused ? 'account' : 'account-outline';
  }

  return (
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons name={iconName} size={size} color={color} />
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  const routeIndex = routeIndexMap[currentRoute.name] ?? 0;
  const initialX = routeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
  const translateX = useSharedValue(initialX);

  useEffect(() => {
    const currentRoute = state.routes[state.index];
    const routeIndex = routeIndexMap[currentRoute.name] ?? 0;
    const targetX = routeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
    
    translateX.value = withTiming(targetX, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [state.index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.tabBar, { height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom }]}>
      <Animated.View style={[styles.indicator, animatedStyle]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabButton}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
          >
            {options.tabBarIcon &&
              options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? '#62AC4A' : '#8E8E93',
                size: 24,
              })}
            {options.tabBarLabel && (
              <View style={styles.labelContainer}>
                {typeof options.tabBarLabel === 'string' ? (
                  <Text
                    style={[
                      styles.label,
                      { color: isFocused ? '#62AC4A' : '#8E8E93' },
                    ]}
                  >
                    {options.tabBarLabel}
                  </Text>
                ) : (
                  options.tabBarLabel({ focused: isFocused, color: isFocused ? '#62AC4A' : '#8E8E93' })
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon route={route} focused={focused} color={color} size={size} />
        ),
        tabBarActiveTintColor: '#62AC4A',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Feed" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Chiến dịch',
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{
          tabBarLabel: 'Sự kiện',
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{
          tabBarLabel: 'Hoạt động',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Cá nhân',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -1,
    width: INDICATOR_WIDTH,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#62AC4A',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

