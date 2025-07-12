import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { COLORS, FONTS } from '../constants';

interface CustomOtpInputProps {
  numberOfDigits?: number;
  value: string;
  onValueChange: (value: string) => void;
  onFilled?: (value: string) => void;
  disabled?: boolean;
  tintColor?: string;
  offTintColor?: string;
  defaultValue?: string;
  cellWidth?: number;
  cellHeight?: number;
  cellSpacing?: number;
  autoFocus?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  testID?: string;
}

const CustomOtpInput: React.FC<CustomOtpInputProps> = ({
  numberOfDigits = 4,
  value,
  onValueChange,
  onFilled,
  disabled = false,
  tintColor = COLORS.primary,
  offTintColor = COLORS.gray,
  defaultValue = '',
  cellWidth = 50,
  cellHeight = 50,
  cellSpacing = 8,
  autoFocus = false,
  editable = true,
  keyboardType = 'number-pad',
  secureTextEntry = false,
  testID,
}) => {
  const [otpValue, setOtpValue] = useState(value || defaultValue);
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setOtpValue(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus && editable && !disabled) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus, editable, disabled]);

  const handleTextChange = (text: string) => {
    // Only allow numbers if keyboardType is numeric
    const filteredText = keyboardType.includes('numeric') || keyboardType.includes('number') || keyboardType.includes('decimal')
      ? text.replace(/[^0-9]/g, '')
      : text;

    const newValue = filteredText.slice(0, numberOfDigits);
    setOtpValue(newValue);
    onValueChange(newValue);

    if (newValue.length === numberOfDigits && onFilled) {
      onFilled(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < numberOfDigits; i++) {
      const digit = otpValue[i] || '';
      const isActive = i === otpValue.length && isFocused;
      
      cells.push(
        <View
          key={i}
          style={[
            styles.cell,
            {
              width: cellWidth,
              height: cellHeight,
              marginRight: i < numberOfDigits - 1 ? cellSpacing : 0,
              borderColor: isActive ? tintColor : offTintColor,
              backgroundColor: isActive ? tintColor + '10' : 'transparent',
            },
          ]}
        >
          <TextInput
            style={[
              styles.cellText,
              {
                color: digit ? COLORS.black : COLORS.gray,
                fontSize: cellHeight * 0.4,
              },
            ]}
            value={digit}
            editable={false}
            selectTextOnFocus={false}
            secureTextEntry={secureTextEntry}
          />
        </View>
      );
    }
    return cells;
  };

  return (
    <View style={styles.container}>
      {/* Hidden input for actual text input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={otpValue}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        editable={editable && !disabled}
        keyboardType={keyboardType}
        maxLength={numberOfDigits}
        autoFocus={autoFocus}
        testID={testID}
      />
      
      {/* Visual cells */}
      <View style={styles.cellsContainer}>
        {renderCells()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  cellsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cellText: {
    ...FONTS.h3,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default CustomOtpInput; 