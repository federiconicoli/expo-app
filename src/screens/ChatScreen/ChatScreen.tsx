import {
  Avatar,
  Box,
  Button,
  FlatList,
  HStack,
  Heading,
  Icon,
  IconButton,
  Modal,
  ScrollView,
  Spacer,
  Text,
  TextArea,
  VStack,
  View,
} from 'native-base';
import { Pressable, RefreshControl, StatusBar, StyleSheet } from 'react-native';
import { auth, db } from '../../config';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import Bugsnag from '@bugsnag/expo';
import { Colors } from '../../config';
import { EvilIcons } from '@expo/vector-icons';
import { Search } from '../../components';
import SwipeableItem from '../../components/SwipeableItem';
import moment from 'moment';
import { useChats } from './ChatHooks';
import { useRefresh } from '../../hooks';
import { useState } from 'react';

export const ChatScreen = ({ navigation }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState({});
  const [textAreaValue, setTextAreaValue] = useState('');

  const { messageList, searchableUsers, sendUserMsg, fetchMessageList } = useChats();

  const handleRefresh = async (): Promise<void> => {
    setTimeout(() => {
      fetchMessageList();
    }, 2000);
  };

  const { isRefreshing, onRefresh } = useRefresh({ handleRefresh });

  return (
    <View marginTop="4">
      <StatusBar />
      <IconButton
        icon={<Icon as={EvilIcons} name="plus" size="2xl" color="black.500" />}
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        onPress={() => setOpen(true)}
      />

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(!open);
        }}
        size="xl"
        height="full"
      >
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>New Message</Modal.Header>
          <Modal.Body>
            <Search
              label="To:"
              data={searchableUsers}
              onSelectionChange={(value) => {
                setSelectedUser(value);
              }}
              resetQuery={Object.keys(selectedUser).length === 0}
              filterKeys={['name', 'userName']}
            />
            <View style={styles.messageArea}>
              <Text>Message</Text>
              <TextArea
                value={textAreaValue}
                autoCompleteType={false}
                onChangeText={(text) => setTextAreaValue(text)}
                h={40}
                placeholder="Text Area Placeholder"
                w="100%"
              />
            </View>
          </Modal.Body>
          <Modal.Footer>
            <Button
              style={styles.sendBtn}
              onPress={async () => {
                try {
                  const userRef = collection(db, 'users');
                  const q = query(
                    userRef,
                    where('userName', '==', selectedUser.userName || ''),
                    where('name', '==', selectedUser.name || ''),
                    limit(1),
                  );
                  const querySnapshot = await getDocs(q);
                  const userQ = query(
                    userRef,
                    where('__name__', '==', auth.currentUser?.uid),
                    limit(1),
                  );
                  querySnapshot.forEach(async (doc) => {
                    const recipientId = doc.id;
                    const messageContent = textAreaValue;
                    await sendUserMsg(auth.currentUser?.uid, recipientId, messageContent);
                    setTextAreaValue('');
                    setSelectedUser({});
                    setOpen(false);
                  });
                } catch (error) {
                  Bugsnag.notify(error);
                }
              }}
              disabled={!Object.keys(selectedUser).length}
            >
              <Text color="white">Send</Text>
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
      <ScrollView
        height="full"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        style={styles.container}
      >
        <Box>
          <Heading fontSize="xl" p="4" pb="3">
            Messages
          </Heading>
          {messageList && messageList.length ? (
            <FlatList
              data={messageList}
              renderItem={({ item }) => (
                <SwipeableItem item={item}>
                  <Pressable
                    key={item.id}
                    style={styles.messageContainer}
                    onPress={() => {
                      navigation.navigate('My Chat', { item });
                    }}
                  >
                    <Box
                      borderBottomWidth="1"
                      _dark={{
                        borderColor: 'muted.50',
                      }}
                      borderColor="muted.800"
                      pl={['0', '4']}
                      pr={['0', '5']}
                      py="2"
                    >
                      <HStack space={[2, 3]} justifyContent="space-between">
                        <Avatar
                          size="48px"
                          source={{
                            uri: item.photo,
                          }}
                        />
                        <VStack>
                          <Text
                            _dark={{
                              color: 'warmGray.50',
                            }}
                            color="coolGray.800"
                            bold
                          >
                            {item.userName || item.name}
                          </Text>
                        </VStack>
                        <Spacer />
                        <Text
                          fontSize="xs"
                          _dark={{
                            color: 'warmGray.50',
                          }}
                          color="coolGray.800"
                          alignSelf="flex-start"
                        >
                          {moment
                            .unix(
                              item.latestMessage.timestamp
                                ? item.latestMessage.timestamp.seconds
                                : item.latestMessage.seconds,
                            )
                            .format('MMMM, Do, h:mm:ss a')}
                        </Text>
                      </HStack>
                    </Box>
                  </Pressable>
                </SwipeableItem>
              )}
              keyExtractor={(item) => item.id}
            />
          ) : (
            <View>
              <Text fontSize="2xl" textAlign="center">
                No Messages Found
              </Text>
            </View>
          )}
        </Box>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  icon: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  sendBtn: {
    backgroundColor: Colors.blue,
    marginTop: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    textAlign: 'center',
    borderRadius: 8,
  },
  messageArea: {
    marginTop: 32,
  },
  modalView: {
    height: 600,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    background: 'red',
    color: 'white',
    top: 10,
    right: 10,
  },
  flexRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  input: {
    width: '100%',
    minHeight: 128,
    borderRadius: 8,
  },
});
