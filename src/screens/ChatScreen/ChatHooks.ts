import React, { useCallback, useEffect, useState } from 'react';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, realtimeDb } from '../../config';
import { onValue, push, ref, set } from 'firebase/database';

import Bugsnag from '@bugsnag/expo';

export const useChats = () => {
  const [messageList, setMessageList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchableUsers, setSearchableUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map((doc) => doc.data());
        setSearchableUsers(users);
      } catch (error) {
        Bugsnag.notify(error);
      }
    };

    fetchUsers();
  }, []);

  const fetchMessageList = () => {
    const userId = auth.currentUser?.uid;

    const messagesRef = ref(realtimeDb, `users/${userId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();

      if (messagesData) {
        const userIds = Object.keys(messagesData);
        const userRef = collection(db, 'users');
        const q = query(userRef, where('__name__', 'in', userIds));

        getDocs(q)
          .then((querySnapshot) => {
            const combinedData = querySnapshot.docs.map((doc) => {
              const userData = doc.data();
              const userId = doc.id;
              const messages = messagesData[userId];
              const latestMessage = messages
                ? Object.values(messages)[Object.values(messages).length - 1]
                : null;
              return {
                ...userData,
                id: doc.id,
                latestMessage,
              };
            });
            setMessageList(combinedData);
          })
          .catch((error) => {
            Bugsnag.notify(error);
          });
      }
    });
  };

  useEffect(() => {
    fetchMessageList();
  }, []);

  const retrieveUserChats = useCallback((receiptId: string) => {
    const userId = auth.currentUser?.uid;

    const messagesRef = ref(realtimeDb, `users/${userId}/messages/${receiptId}`);
    const messagesListener = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();
      if (messagesData) {
        const senderIds = Object.values(messagesData).map((message) => message.senderId);

        // Split senderIds into chunks of 10 elements or less
        const chunks = [];
        const chunkSize = 10;
        for (let i = 0; i < senderIds.length; i += chunkSize) {
          chunks.push(senderIds.slice(i, i + chunkSize));
        }

        const userRef = collection(db, 'users');

        // Create an array to hold the results
        const queries = chunks.map((chunk) => {
          const q = query(userRef, where('__name__', 'in', chunk));
          return getDocs(q);
        });

        // Execute all queries concurrently using Promise.all()
        Promise.all(queries)
          .then((querySnapshots) => {
            const usersData = querySnapshots.reduce((users, querySnapshot) => {
              querySnapshot.docs.forEach((doc) => {
                const userData = doc.data();
                const userId = doc.id;
                users[userId] = userData;
              });
              return users;
            }, {});

            // Combine messagesData and usersData
            const flattenedArray = Object.entries(messagesData).map(([key, value]) => ({
              id: key,
              ...value,
              user: usersData[value.senderId],
            }));

            const sortedMessages = flattenedArray.sort((a, b) => {
              const timestampA = a.timestamp.seconds;
              const timestampB = b.timestamp.seconds;

              if (timestampA < timestampB) {
                return -1;
              }
              if (timestampA > timestampB) {
                return 1;
              }
              return 0;
            });

            // Update the state with the combined data
            setMessages(sortedMessages);
          })
          .catch((error) => {
            Bugsnag.notify(error);
          });
      }
    });

    return () => {
      // Cleanup listener
      messagesListener();
    };
  }, []);

  const sendUserMsg = async (senderId: string, recipientId: string, msg: string) => {
    try {
      const senderMessagesRef = ref(realtimeDb, `users/${senderId}/messages/${recipientId}`);
      const recipientMessagesRef = ref(realtimeDb, `users/${recipientId}/messages/${senderId}`);

      const newMessageRef = push(senderMessagesRef);
      const newMessageRecipientMessageRef = push(recipientMessagesRef);

      const timestamp = Timestamp.now();

      const messageData = {
        senderId: senderId,
        content: msg,
        timestamp: timestamp,
      };

      await set(newMessageRef, messageData);
      await set(newMessageRecipientMessageRef, messageData);
    } catch (error) {
      Bugsnag.notify(error);
    }
  };

  return {
    messageList,
    searchableUsers,
    sendUserMsg,
    retrieveUserChats,
    fetchMessageList,
    messages,
  };
};
