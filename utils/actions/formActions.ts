import {
    validateCreditCardNumber,
    validateCVV,
    validateEmail,
    validateExpiryDate,
    validateNumber,
    validatePassword,
    validateString
} from '../ValidationConstraints';
  
  export const validateInput = (inputId: string, inputValue: string): string | undefined => {
    // Make full name optional - no validation needed if empty
    if (inputId === 'fullName') {
      return inputValue.trim() === '' ? undefined : validateString(inputId, inputValue);
    } else if (
      inputId === 'projectName' ||
      inputId === 'boardName' ||
      inputId === 'taskName' ||
      inputId === 'taskTitle' ||
      inputId === 'taskDescription' ||
      inputId === 'firstName' ||
      inputId === 'lastName' ||
      inputId === 'location' ||
      inputId === 'phoneNumber' ||
      inputId === 'bio' ||
      inputId === 'address' ||
      inputId === 'street' ||
      inputId === 'postalCode' ||
      inputId === 'appartment' ||
      inputId === 'destination' ||
      inputId === 'ageRange' ||
      inputId === 'description' ||
      inputId === 'about' ||
      inputId === 'creditCardHolderName' ||
      inputId === 'addressLine1' ||
      inputId === 'addressLine2'  
    ) {
      return validateString(inputId, inputValue);
    } else if (inputId === 'email' || 
      inputId === 'currentEmail' || 
      inputId === 'newEmail') {
      return validateEmail(inputId, inputValue);
    } else if (
      inputId === 'password' || 
      inputId === 'confirmPassword' || 
      inputId === 'currentPassword' || 
      inputId === 'newPassword' ||
      inputId === 'confirmNewPassword'
      ) {
      return validatePassword(inputId, inputValue);
    } else if (inputId === 'resetToken') {
      return validateString(inputId, inputValue);
    } else if(inputId === 'places') {
      return validateNumber(inputId, inputValue)
    }else if(inputId === 'creditCardNumber'){
      return validateCreditCardNumber(inputId, inputValue)
    }else if(inputId === 'creditCardExpiryDate'){
        return validateExpiryDate(inputId, inputValue)
    }else if(inputId === 'cvv'){
        return validateCVV(inputId, inputValue)
    }
  };