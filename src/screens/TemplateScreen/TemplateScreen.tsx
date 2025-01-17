import { Alert, Modal, Pressable, SafeAreaView, ScrollView, View } from 'react-native';
import { Button, Text } from '../../components';
import { Card, Layout } from '@ui-kitten/components';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDownloadURL, listAll, ref } from 'firebase/storage';

import Bugsnag from '@bugsnag/expo';
import Constants from 'expo-constants';
import Icon from 'react-native-vector-icons/FontAwesome';
import Pdf from 'react-native-pdf';
import { StatusBar } from 'expo-status-bar';
import { TemplateScreenStyles } from './TemplateScreenStyles';
import _ from 'lodash';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { storage } from '../../config';

export const PayWallView = ({ modalVisible, setModalVisible, monthlyPkg, annualPkg }) => {
  const styles = TemplateScreenStyles;

  const handleMonthlySubscription = useCallback(async () => {
    try {
      if (monthlyPkg) {
        await Purchases.purchasePackage(monthlyPkg);
      }
    } catch (error) {
      Bugsnag.notify(error);
    }
  }, [monthlyPkg]);

  const handleAnnualSubscription = useCallback(async () => {
    try {
      if (annualPkg) {
        await Purchases.purchasePackage(annualPkg);
      }
    } catch (error) {
      Bugsnag.notify(error);
    }
  }, [annualPkg]);

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert('Modal has been closed.');
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Pressable onPress={() => setModalVisible(!modalVisible)} style={styles.close}>
              <Icon style={{ marginRight: 8 }} name="close" size={24} />
            </Pressable>
            <Text
              category="h5"
              style={{
                fontFamily: 'Ubuntu',
                lineHeight: 90,
                textAlign: 'center',
                backgroundColor: '#ededed',
                width: 310,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: 'black',
                borderRadius: 2,
              }}
            >
              Friendly Realtor Subscription
            </Text>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Icon style={{ marginRight: 16 }} name="check" size={24} color="#02FDAA" />
              <Text category="h6" style={{ fontFamily: 'Ubuntu' }}>
                Manage your deals feature
              </Text>
            </View>
            <View style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
              <Card>
                <Text category="h2" status="info" style={{ fontFamily: 'Ubuntu' }}>
                  {monthlyPkg?.product.priceString}/month
                </Text>
                <Button
                  style={{
                    width: 250,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 16,
                    backgroundColor: '#02FDAA',
                    fontFamily: 'Ubuntu',
                  }}
                  onPress={handleMonthlySubscription}
                >
                  <Text>Monthly</Text>
                </Button>
              </Card>
              <Card style={{ marginTop: 64 }}>
                <Text category="h2" status="info" style={{ fontFamily: 'Ubuntu' }}>
                  {annualPkg?.product.priceString}/year
                </Text>
                <Button
                  style={{
                    width: 250,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 16,
                    backgroundColor: '#02FDAA',
                    fontFamily: 'Ubuntu',
                  }}
                  onPress={handleAnnualSubscription}
                >
                  <Text>Annually</Text>
                </Button>
              </Card>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const TemplateScreen = () => {
  const styles = TemplateScreenStyles;
  const userAuth = getAuth();

  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage>(null);
  const [templatePkg, setTemplatePkg] = useState<PurchasesPackage>(null);
  const [remotePDF, setRemotePDF] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesRef = ref(storage, 'templates/');
        const listOfTemplates = await listAll(templatesRef);

        if (listOfTemplates && _.size(listOfTemplates)) {
          listOfTemplates.items.forEach((item) => {
            getDownloadURL(item).then(async (downloadURL) => {
              setRemotePDF((remotePDF) => [...remotePDF, downloadURL]);
            });
          });
        }
      } catch (error) {
        Bugsnag.notify(error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings) {
          if (offerings.all.default_offering) {
            if (offerings.all.default_offering.monthly) {
              setMonthlyPkg(offerings.all.default_offering.monthly);
            }
            if (offerings.all.default_offering.annual) {
              setAnnualPkg(offerings.all.default_offering.annual);
            }
          }
          if (offerings.all.marketing_offering) {
            if (offerings.all.marketing_offering.lifetime) {
              setTemplatePkg(offerings.all.marketing_offering.lifetime);
            }
          }
        }
      } catch (error) {
        Bugsnag.notify(error);
      }
    };

    fetchOfferings();
  }, []);

  const handleInAppPurchase = useCallback(
    async (pdf: any) => {
      try {
        if (templatePkg) {
          const { customerInfo } = await Purchases.purchasePackage(templatePkg);
          if (typeof customerInfo.entitlements.active.marketing_entitlement !== 'undefined') {
            const clouldUrl = `${Constants.manifest.extra.cloudFunctionUrl}/sendPdfEmail`;
            const data = { pdf, email: userAuth.currentUser?.email };
            axios.post(clouldUrl, data).catch((error) => {
              Bugsnag.notify(error);
              console.log('error', error);
            });
          }
        }
      } catch (error) {
        Bugsnag.notify(error);
        if (!error.userCancelled) {
          console.log('cancel error', error);
        } else {
          console.log('error', error);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templatePkg],
  );

  return (
    <Layout style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <PayWallView
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        monthlyPkg={monthlyPkg}
        annualPkg={annualPkg}
      />
      <Text style={{ fontFamily: 'Ubuntu', padding: 8 }}>
        They are an efficient way for businesses to create visually appealing marketing materials
        without starting from scratch. With editable marketing templates, businesses can save time
        and resources while ensuring that their marketing efforts are consistent and
        professional-looking.
      </Text>
      <Button
        style={{
          width: 250,
          display: 'flex',
          flexDirection: 'row',
          marginLeft: 16,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 10,
          borderRadius: 8,
          marginTop: 16,
          marginBottom: 32,
          fontFamily: 'Ubuntu',
          backgroundColor: '#ededed',
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text>Upgrade</Text>
      </Button>
      <ScrollView>
        <SafeAreaView>
          {remotePDF && _.size(remotePDF)
            ? remotePDF.map((pdf, index) => (
                <View key={index} style={{ padding: 16 }}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {templatePkg && templatePkg.product.priceString && (
                      <Text category="h4">{templatePkg.product.priceString}</Text>
                    )}
                    <Button
                      style={{
                        width: 250,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: '#02FDAA',
                        borderColor: '#02FDAA',
                      }}
                      onPress={() => handleInAppPurchase(pdf)}
                    >
                      <Text>Purchase Marketing Template</Text>
                    </Button>
                  </View>

                  <Pdf
                    trustAllCerts={false}
                    ref={pdfRef}
                    source={{ uri: pdf, cache: true }}
                    onError={(error) => {
                      console.log(error);
                    }}
                    style={{
                      flex: 1,
                      alignSelf: 'stretch',
                      height: 500,
                      paddingTop: 8,
                    }}
                  />
                </View>
              ))
            : null}
        </SafeAreaView>
      </ScrollView>
    </Layout>
  );
};
