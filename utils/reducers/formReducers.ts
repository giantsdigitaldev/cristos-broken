export const reducer = (state: any, action: any) => {
    const { validationResult, inputId, inputValue } = action;

    const updatedValues = {
        ...state.inputValues,
        [inputId]: inputValue,
    };

    const updatedValidities = {
        ...state.inputValidities,
        [inputId]: validationResult,
    };

    let updatedFormIsValid = true;

    for (const key in updatedValidities) {
        if (updatedValidities[key]) {
            updatedFormIsValid = false;
            break;
        }
    }

    return {
        inputValues: updatedValues,
        inputValidities: updatedValidities,
        formIsValid: updatedFormIsValid,
    };
};