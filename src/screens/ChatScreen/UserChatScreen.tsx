import React, { useEffect, useState, useRef } from 'react';
import { Avatar, FlatList, View, Text, Input, Button, ScrollView } from 'native-base';
import { useRoute } from '@react-navigation/native';
import { useChats } from './ChatHooks';
import moment from 'moment';
import { auth } from '../../config';

export const UserChatScreen = () => {
  const [value, setValue] = useState<string>('');

  const route = useRoute();
  const scrollViewRef = useRef(null);
  const { retrieveUserChats, messages, sendUserMsg } = useChats();
  const { item } = route.params;

  useEffect(() => {
    if (item.id) {
      retrieveUserChats(item.id);
    }
  }, [item.id]);

  // Render each message item
  const renderItem = ({ item, index }) => {
    const isFirstMessageFromSender = index === 0 || item.senderId !== messages[index - 1].senderId;
    return (
      <View>
        <View
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          mb="4"
        >
          {isFirstMessageFromSender ? (
            <Avatar
              size="48px"
              source={{
                uri: item.user.photo,
              }}
              mt={4}
            />
          ) : null}
          {isFirstMessageFromSender && (
            <Text textAlign="right">
              {' '}
              {moment.unix(item.timestamp.seconds).format('MMMM, Do, h:mm:ss a')}
            </Text>
          )}
        </View>
        <Text>{item.content}</Text>
      </View>
    );
  };

  return (
    <View flex={1} marginY={16} marginX={4}>
      <ScrollView
        marginBottom={6}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <FlatList data={messages} keyExtractor={(item) => item.id} renderItem={renderItem} />
      </ScrollView>
      <View display="flex" flexDirection="column" alignItems="flex-end">
        <Input
          value={value}
          onChangeText={(text) => setValue(text)}
          placeholder="Send Message..."
          borderRadius={99}
          borderColor="black"
        />
        <Button
          marginTop={4}
          borderRadius={99}
          width={100}
          onPress={async () => {
            await sendUserMsg(auth.currentUser?.uid, item.id, value);
            setValue('');
          }}
        >
          Send
        </Button>
      </View>
    </View>
  );
};
