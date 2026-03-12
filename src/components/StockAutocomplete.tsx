/**
 * StockAutocomplete - 종목 자동완성 입력 컴포넌트
 *
 * 드롭다운을 position:absolute 로 렌더링.
 * 이 컴포넌트는 ScrollView 바깥에 배치해야 클리핑되지 않음.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchStocks, StockItem } from '../utils/stockSearch';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  value: string;
  onSelect: (code: string, name: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function StockAutocomplete({
  value,
  onSelect,
  placeholder = '종목을 검색하세요',
  editable = true,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const selectingRef = useRef(false);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (text.length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const results = searchStocks(text, 10);
    setSuggestions(results);
    setShowDropdown(results.length > 0);
  }, []);

  const handleSelect = useCallback((item: StockItem) => {
    selectingRef.current = true;
    setQuery(item.name_ko);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(item.code, item.name_ko);
    setTimeout(() => { selectingRef.current = false; }, 300);
  }, [onSelect]);

  const handleBlur = useCallback(() => {
    if (selectingRef.current) return;
    setTimeout(() => {
      if (!selectingRef.current) setShowDropdown(false);
    }, 150);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onSelect('', '');
    inputRef.current?.focus();
  }, [onSelect]);

  React.useEffect(() => {
    if (value !== query) {
      setQuery(value);
      if (!value) {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textDim} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDim}
          editable={editable}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionRow}
                onPressIn={() => { selectingRef.current = true; }}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {item.name_ko}
                </Text>
                <View style={styles.suggestionRight}>
                  <Text style={styles.suggestionCode}>{item.code}</Text>
                  <Text style={styles.suggestionMarket}>{item.market}</Text>
                </View>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="always"
            scrollEnabled={suggestions.length > 5}
            style={{ maxHeight: 260 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
    elevation: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#c8d0e0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  suggestionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  suggestionCode: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  suggestionMarket: {
    fontSize: 10,
    color: COLORS.textDim,
  },
});
