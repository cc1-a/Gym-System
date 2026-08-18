import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Linking, ScrollView, Image } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  
  // App State
  const serverUrl = 'https://gym-system-three.vercel.app';
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberPackage, setMemberPackage] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // First Login State
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Navigation State
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'profile'
  
  // Profile Password Change State
  const [profilePwChangeStage, setProfilePwChangeStage] = useState(0); // 0: None, 1: Enter Code, 2: New Password
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const LOGIN_URL = `${serverUrl}/api/login`; 
    
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setMemberId(result.member_id);
        setMemberName(result.name);
        setMemberPhone(result.phone);
        setMemberPackage(result.package_name);
        setIsPaid(result.is_paid);
        setProfilePicUrl(result.profile_pic_url);
        setEmail(result.email || email);
        
        if (result.is_first_login) {
          setNeedsPasswordChange(true);
        } else {
          setIsLoggedIn(true);
        }
      } else {
        Alert.alert("Login Failed", result.error || "Invalid email or password.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", `Could not connect to ${LOGIN_URL}.`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editPhone.startsWith('94')) {
      Alert.alert("Error", "WhatsApp number must start with 94 (e.g. 94766226039)");
      return;
    }
    try {
      const response = await fetch(`${serverUrl}/api/update_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, name: editName, email: editEmail, phone: editPhone }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setMemberName(result.name);
        setEmail(result.email);
        setMemberPhone(result.phone);
        setIsEditingProfile(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to update profile.");
      }
    } catch (e) {
      Alert.alert("Network Error", "Could not connect to the server.");
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }
    
    const SET_PW_URL = `${serverUrl}/api/set_password`; 
    
    try {
      const response = await fetch(SET_PW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, new_password: newPassword }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        Alert.alert("Success", "Password updated successfully!");
        setNeedsPasswordChange(false);
        setProfilePwChangeStage(0);
        setNewPassword('');
        setConfirmPassword('');
        setIsLoggedIn(true);
      } else {
        Alert.alert("Error", result.error || "Failed to update password.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to the server.");
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    const SCAN_URL = `${serverUrl}/api/scan_qr`; 
    
    try {
      const response = await fetch(SCAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          qr_id: data,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        Alert.alert("Success", result.message || "Attendance logged successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to enter gym.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to the server to log attendance.");
    }
    
    setIsScanning(false);
  };

  const triggerWhatsAppVerification = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    setProfilePwChangeStage(1);
    Alert.alert("WhatsApp Simulation", `Message sent to ${memberPhone}:\n\nYour Syncravix Gym verification code is: ${code}`);
  };

  const verifyWhatsAppCode = () => {
    if (enteredCode === generatedCode) {
      setProfilePwChangeStage(2);
      setEnteredCode('');
    } else {
      Alert.alert("Error", "Invalid verification code.");
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.text}>No access to camera</Text></View>;
  }

  // --- SCANNING SCREEN (CAMERA OPEN) ---
  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Scan Gym QR Code</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsScanning(false)}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- SET NEW PASSWORD SCREEN (First Login) ---
  if (needsPasswordChange) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={{color: '#888', marginBottom: 20, textAlign: 'center'}}>
          Since this is your first time logging in, please set a new permanent password.
        </Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>New Password:</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#888"
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
              <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color="#C6F91F" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password:</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#888"
              secureTextEntry={!showNewPassword}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.btn, (!newPassword.trim() || !confirmPassword.trim()) && styles.btnDisabled]} 
            disabled={!newPassword.trim() || !confirmPassword.trim()}
            onPress={handleSetPassword}
          >
            <Text style={styles.btnText}>Save Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- LOGGED IN TABS ---
  if (isLoggedIn) {
    return (
      <View style={styles.container}>
        {/* Content Area */}
        <View style={styles.content}>
          {currentTab === 'home' && (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%'}}>
              <Text style={styles.title}>Welcome, {memberName}</Text>
              
              <View style={styles.card}>
                <View style={{alignItems: 'center', marginBottom: 30}}>
                  <View style={[styles.statusBadge, { backgroundColor: isPaid ? 'rgba(198, 249, 31, 0.2)' : 'rgba(255, 76, 76, 0.2)' }]}>
                    <Text style={[styles.statusText, { color: isPaid ? '#C6F91F' : '#ff4c4c' }]}>
                      STATUS: {isPaid ? 'PAID' : 'PAYMENT PENDING'}
                    </Text>
                  </View>
                  {!isPaid && (
                    <Text style={{color: '#888', marginTop: 10, textAlign: 'center'}}>
                      You must be marked as Paid by the admin before entering the gym.
                    </Text>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.btn, {flexDirection: 'row', justifyContent: 'center'}, !isPaid && styles.btnDisabled]} 
                  disabled={!isPaid}
                  onPress={() => {
                    setScanned(false);
                    setIsScanning(true);
                  }}
                >
                  <Ionicons name="camera" size={24} color="#000" style={{marginRight: 10}} />
                  <Text style={styles.btnText}>Enter Gym</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentTab === 'profile' && (
            <ScrollView style={{flex: 1, width: '100%'}} contentContainerStyle={{paddingVertical: 40}}>
              <Text style={styles.title}>Your Profile</Text>
              
              <View style={styles.card}>
                {profilePicUrl ? (
                  <Image source={{ uri: profilePicUrl }} style={{width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 20}} />
                ) : (
                  <View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20, justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{color: '#888'}}>No Pic</Text>
                  </View>
                )}

                {isEditingProfile ? (
                  <View>
                    <Text style={styles.label}>Name</Text>
                    <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                    <Text style={styles.label}>WhatsApp Number</Text>
                    <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="e.g. 94766226039 (Omit 0)" keyboardType="phone-pad" />
                    <TouchableOpacity style={[styles.btn, {marginBottom: 10}]} onPress={handleUpdateProfile}>
                      <Text style={styles.btnText}>Save Changes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff'}]} onPress={() => setIsEditingProfile(false)}>
                      <Text style={[styles.btnText, {color: '#fff'}]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.label}>Name</Text>
                    <Text style={styles.profileValue}>{memberName}</Text>

                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.profileValue}>{email}</Text>

                    <Text style={styles.label}>WhatsApp Number</Text>
                    <Text style={styles.profileValue}>{memberPhone}</Text>

                    <Text style={styles.label}>Subscription Package</Text>
                    <Text style={styles.profileValue}>{memberPackage}</Text>

                    <TouchableOpacity 
                      style={[styles.btn, {marginTop: 20, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#C6F91F'}]}
                      onPress={() => {
                        setEditName(memberName);
                        setEditEmail(email);
                        setEditPhone(memberPhone);
                        setIsEditingProfile(true);
                      }}
                    >
                      <Text style={[styles.btnText, {color: '#C6F91F'}]}>Edit Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.btn, {marginTop: 10, backgroundColor: '#25D366'}]}
                      onPress={() => Linking.openURL('https://chat.whatsapp.com/sample')}
                    >
                      <Text style={[styles.btnText, {color: '#fff'}]}>Join WhatsApp Group</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Password Change Section */}
              <View style={[styles.card, {marginTop: 20}]}>
                <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15}}>Security</Text>
                
                {profilePwChangeStage === 0 && (
                  <TouchableOpacity 
                    style={[styles.btn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#C6F91F'}]}
                    onPress={triggerWhatsAppVerification}
                  >
                    <Text style={[styles.btnText, {color: '#C6F91F'}]}>Change Password</Text>
                  </TouchableOpacity>
                )}

                {profilePwChangeStage === 1 && (
                  <View>
                    <Text style={{color: '#888', marginBottom: 10}}>Enter the 4-digit code sent to your WhatsApp.</Text>
                    <TextInput 
                      style={styles.input}
                      value={enteredCode}
                      onChangeText={setEnteredCode}
                      placeholder="e.g. 1234"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <TouchableOpacity style={styles.btn} onPress={verifyWhatsAppCode}>
                      <Text style={styles.btnText}>Verify Code</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {profilePwChangeStage === 2 && (
                  <View>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput 
                        style={styles.passwordInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New password"
                        placeholderTextColor="#888"
                        secureTextEntry={!showNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                        <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color="#C6F91F" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput 
                        style={styles.passwordInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                        placeholderTextColor="#888"
                        secureTextEntry={!showNewPassword}
                      />
                    </View>
                    <TouchableOpacity style={styles.btn} onPress={handleSetPassword}>
                      <Text style={styles.btnText}>Update Password</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ff4c4c', marginTop: 30 }]} 
                onPress={() => setIsLoggedIn(false)}
              >
                <Text style={[styles.btnText, { color: '#ff4c4c' }]}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setCurrentTab('home')}
          >
            <Ionicons name="home" size={24} color={currentTab === 'home' ? '#C6F91F' : '#888'} />
            <Text style={[styles.navText, { color: currentTab === 'home' ? '#C6F91F' : '#888' }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => {
              setCurrentTab('profile');
              setProfilePwChangeStage(0); // Reset password change state on tab switch
            }}
          >
            <Ionicons name="person" size={24} color={currentTab === 'profile' ? '#C6F91F' : '#888'} />
            <Text style={[styles.navText, { color: currentTab === 'profile' ? '#C6F91F' : '#888' }]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- LOGIN SCREEN ---
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym Member Login</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Email Address:</Text>
        <TextInput 
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordContainer}>
          <TextInput 
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#C6F91F" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.btn, (!email.trim() || !password.trim()) && styles.btnDisabled]} 
          disabled={!email.trim() || !password.trim()}
          onPress={handleLogin}
        >
          <Text style={styles.btnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    alignSelf: 'center',
  },
  networkConfig: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
    paddingBottom: 4,
  },
  label: {
    color: '#888',
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  profileValue: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  input: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginBottom: 24,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  eyeBtn: {
    padding: 16,
  },
  btn: {
    backgroundColor: '#C6F91F',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#556611',
    opacity: 0.5,
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 30,
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#C6F91F',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    width: '100%',
    paddingVertical: 15,
    paddingBottom: 30, // For iOS home indicator
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
  }
});
