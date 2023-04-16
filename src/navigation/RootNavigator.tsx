import React, { useState, useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import Purchases from 'react-native-purchases';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { AuthenticatedUserContext } from '../providers';
import { SplashScreen } from '../screens';
import { auth, db } from '../config';
import { doc, getDoc } from 'firebase/firestore';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';

export const RootNavigator = () => {
  const { user, setUser } = useContext(AuthenticatedUserContext);
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Ubuntu: require('../../assets/fonts/Ubuntu/Ubuntu-Regular.ttf'),
  });

  useEffect(() => {
    const unsubscribeAuthStateChanged = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (fontsLoaded) {
        setIsLoading(false);
      }

      try {
        if (authenticatedUser) {
          const { uid } = authenticatedUser;
          const docSnap = await getDoc(doc(db, 'users', uid));
          if (docSnap.exists()) {
            setUser(docSnap.data());
            await Purchases.configure({
              apiKey: Constants.manifest?.extra?.purchaseApiKey,
              appUserID: uid,
            });
          }

          if (user) {
            const customerInfo = await Purchases.getCustomerInfo();

            if (customerInfo) {
              setUser((prev) => {
                return {
                  ...prev,
                  customerInfo,
                };
              });
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    });

    return unsubscribeAuthStateChanged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.currentUser, fontsLoaded]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user && auth.currentUser && auth.currentUser.emailVerified ? (
        <AppTabs currentUser={auth.currentUser} user={user} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
