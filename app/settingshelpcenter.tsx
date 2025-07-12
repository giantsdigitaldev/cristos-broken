import HelpCenterItem from '@/components/HelpCenterItem';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, Image, LayoutAnimation, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneMap, TabBar, TabView } from 'react-native-tab-view';
import { ScrollView } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { faqKeywords, faqs } from '../data';
import { useTheme } from '../theme/ThemeProvider';

interface KeywordItemProps {
  item: {
    id: string;
    name: string;
  };
  onPress: (id: string) => void;
  selected: boolean;
}

// Define the types for the route and focused props
interface TabRoute {
  key: string;
  title: string;
}

interface RenderLabelProps {
  route: TabRoute;
  focused: boolean;
}

const FaqsRoute = () => {
  const [selectedKeywords, setSelectedKeywords] = useState<any>([]);
  const [expanded, setExpanded] = useState(-1);
  const [searchText, setSearchText] = useState('');

  const { dark } = useTheme();

  const handleKeywordPress = (id: any) => {
    setSelectedKeywords((prevSelectedKeywords: any) => {
      const selectedKeyword = faqKeywords.find((keyword) => keyword.id === id);

      if (!selectedKeyword) {
        // Handle the case where the keyword with the provided id is not found
        return prevSelectedKeywords;
      }

      if (prevSelectedKeywords.includes(selectedKeyword.name)) {
        return prevSelectedKeywords.filter((keyword: any) => keyword !== selectedKeyword.name);
      } else {
        return [...prevSelectedKeywords, selectedKeyword.name];
      }
    });
  };

  const KeywordItem: React.FC<KeywordItemProps> = ({ item, onPress, selected }) => {
    return (
      <TouchableOpacity style={{
        paddingHorizontal: 14,
        marginHorizontal: 5,
        borderRadius: 21,
        height: 39,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: COLORS.primary,
        borderWidth: 1,
        backgroundColor: selected ? COLORS.primary : "transparent",
      }} onPress={() => onPress(item.id)}>
        <Text style={{ color: selected ? COLORS.white : COLORS.primary }}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const toggleExpand = (index: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prevExpanded) => (prevExpanded === index ? -1 : index));
  };
  return (
    <View>
      <View style={{ marginVertical: 16 }}>
        <FlatList
          data={faqKeywords}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <KeywordItem
              item={item}
              onPress={handleKeywordPress}
              selected={selectedKeywords.includes(item.name)}
            />
          )}
        />
      </View>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
          },
        ]}>
        <TouchableOpacity>
          <Image
            source={icons.search}
            resizeMode="contain"
            style={[
              styles.searchIcon,
              {
                tintColor: dark
                  ? COLORS.greyscale600
                  : COLORS.grayscale400,
              },
            ]}
          />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            {
              color: dark
                ? COLORS.greyscale300
                : COLORS.grayscale400,
            },
          ]}
          placeholder="Search"
          placeholderTextColor={dark ? COLORS.greyscale600 : COLORS.grayscale400}
          value={searchText}
          onChangeText={(text) => setSearchText(text)}
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginVertical: 22 }}>
        {faqs
          .filter((faq) => {
            if (selectedKeywords.length === 0) return true;
            return (
              faq.type &&
              selectedKeywords.includes(faq.type)
            );
          })
          .filter((faq) =>
            faq.question.toLowerCase().includes(searchText.toLowerCase())
          )
          .map((faq, index) => (
            <View key={index} style={[styles.faqContainer, {
              backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
            }]}>
              <TouchableOpacity
                onPress={() => toggleExpand(index)}
                activeOpacity={0.8}>
                <View style={styles.questionContainer}>
                  <Text style={[styles.question, {
                    color: dark ? COLORS.white : COLORS.black,
                  }]}>{faq.question}</Text>
                  <Text style={[styles.icon, {
                    color: dark ? COLORS.white : COLORS.black,
                  }]}>
                    {expanded === index ? '-' : '+'}
                  </Text>
                </View>
              </TouchableOpacity>
              {expanded === index && (
                <Text style={[styles.answer, {
                  color: dark ? COLORS.secondaryWhite : COLORS.gray2
                }]}>{faq.answer}</Text>
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
};

const ContactUsRoute = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark } = useTheme();

  return (
    <View style={[styles.routeContainer, {
      backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite
    }]}>
      <HelpCenterItem
        icon={icons.headset}
        title="Customer Service"
        onPress={() => navigation.navigate("customerservice")}
      />
      <HelpCenterItem
        icon={icons.whatsapp}
        title="Whatsapp"
        onPress={() => console.log('Whatsapp')}
      />
      <HelpCenterItem
        icon={icons.world}
        title="Website"
        onPress={() => console.log('Website')}
      />
      <HelpCenterItem
        icon={icons.facebook2}
        title="Facebook"
        onPress={() => console.log('Facebook')}
      />
      <HelpCenterItem
        icon={icons.twitter}
        title="Twitter"
        onPress={() => console.log("Twitter")}
      />
      <HelpCenterItem
        icon={icons.instagram}
        title="Instagram"
        onPress={() => console.log("Instagram")}
      />
    </View>
  )
}
const renderScene = SceneMap({
  first: FaqsRoute,
  second: ContactUsRoute,
});

// Settings help center
const SettingsHelpCenter = () => {
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'first', title: 'FAQ' },
    { key: 'second', title: 'Contact Us' },
  ]);

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{
        backgroundColor: COLORS.primary,
      }}
      activeColor={COLORS.primary}
      inactiveColor={dark ? COLORS.white : COLORS.greyscale900}
      style={{
        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
      }}
      renderLabel={({ route, focused }: RenderLabelProps) => (
        <Text style={[{
          color: focused ? COLORS.primary : 'gray',
          fontSize: 16,
          fontFamily: "bold"
        }]}>
          {route.title}
        </Text>
      )}
    />
  )
  /**
   * render header
   */
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              resizeMode='contain'
              style={[styles.backIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Help Center</Text>
        </View>
        <TouchableOpacity>
          <Image
            source={icons.moreCircle}
            resizeMode='contain'
            style={[styles.moreIcon, {
              tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900
            }]}
          />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 16
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.black
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black
  },
  routeContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 22
  },
  searchBar: {
    width: SIZES.width - 32,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.grayscale100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  searchIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.grayscale400
  },
  input: {
    flex: 1,
    color: COLORS.grayscale400,
    marginHorizontal: 12
  },
  faqContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontFamily: "semiBold",
    color: '#333',
  },
  icon: {
    fontSize: 18,
    color: COLORS.gray2,
  },
  answer: {
    fontSize: 14,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontFamily: "regular",
    color: COLORS.gray2,
  },
})

export default SettingsHelpCenter