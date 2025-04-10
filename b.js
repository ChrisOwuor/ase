
import bcrypt from 'bcryptjs';

// Function to hash the password
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // Generate salt with 10 rounds
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error("Error hashing password:", error);
    }
};

// Function to verify the password
const verifyPassword = async (enteredPassword, storedHash) => {
    try {
        const isMatch = await bcrypt.compare(enteredPassword, storedHash);
        return isMatch;
    } catch (error) {
        console.error("Error comparing passwords:", error);
    }
};

// Test function
const testHashAndVerify = async () => {
    const password = 'mySuperSecretPassword';
    const hashedPassword = await hashPassword(password);
    console.log('Hashed Password:', hashedPassword);

    const isPasswordCorrect = await verifyPassword(password, hashedPassword);
    console.log('Password Match:', isPasswordCorrect ? 'Correct' : 'Incorrect');
};

// Call the test function
testHashAndVerify();
