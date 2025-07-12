import React from 'react';
import { View, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface DotsViewProps {
    progress: number;
    dotSize?: number;
    dotSpacing?: number;
    dotColor?: string;
    activeDotColor?: string;
    numDots?: number;
}

const DotsView: React.FC<DotsViewProps> = ({
    progress,
    dotSize = 10,
    dotSpacing = 5,
    dotColor = 'gray',
    activeDotColor = COLORS.primary,
    numDots = 3,
}) => {
    const dots = [];

    for (let i = 0; i < numDots; i++) {
        dots.push(
            <View
                key={i}
                style={[
                    {
                        borderWidth: 1,
                        borderColor: 'transparent',
                    },
                    {
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        marginHorizontal: dotSpacing / 2,
                    },
                    progress >= i / (numDots - 1)
                        ? {
                            backgroundColor: activeDotColor,
                        }
                        : {
                            backgroundColor: dotColor,
                        },
                ] as ViewStyle[]}
            />
        );
    }

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            {dots}
        </View>
    );
}

export default DotsView;