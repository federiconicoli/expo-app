import React, { useEffect, useState } from 'react';
import {
	Image,
	View,
	FlatList,
	StyleSheet,
	Dimensions
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import axios from 'axios';

export const LocalRestaurantScreen = () => {
	const styles = StyleSheet.create({
		container: {
			flex: 1,
			marginVertical: 20,
		},
		item: {
			backgroundColor: '#4D243D',
			alignItems: 'center',
			justifyContent: 'center',
			flex: 1,
			margin: 1,
			height: Dimensions.get('window').width/3, // approximate a square
		},
		itemInvisible: {
			backgroundColor: 'transparent',
		},
		itemText: {
			color: '#fff',
		},
	});

	const [restaurantList, setRestaurantList] = useState([])
	const numColumns = 3;

	useEffect(() => {
		axios({
      method: 'get',
      url: `http://localhost:5001/local-restaurants`,
			params: { location: '38.79371,-77.061651' }
    })
      .then(response => {
				const { data } = response
				setRestaurantList(data)
      })
      .catch(error => {
        console.log('receiving', error);
      });
	}, [])

	renderItem = ({ item, index }) => {
		const { name, icon, reference, rating, opening_hours } = item
		if (!opening_hours?.open_now) {
			return false
		}

		return (
			<Surface key={reference} elevation={4}>
				<Image style={{ width: 66, height: 58 }}
				source={{
					uri: icon,
				}} />
				<Text>{name}</Text>
				<Text>{rating}</Text>
			</Surface>
		)
  };

	formatData = (data, numColumns) => {
		const numberOfFullRows = Math.floor(data.length / numColumns);
		let numberOfElementsLastRow = data.length - (numberOfFullRows * numColumns);
		while (numberOfElementsLastRow !== numColumns && numberOfElementsLastRow !== 0) {
			data.push({ key: `blank-${numberOfElementsLastRow}`, empty: true });
			numberOfElementsLastRow++;
		}
		return data;
	};

  return (
    <View style={{ flex: 1, marginTop: 50 }}>
			<FlatList data={formatData(restaurantList, numColumns)} renderItem={renderItem} numColumns={numColumns} />
    </View>
  );
};