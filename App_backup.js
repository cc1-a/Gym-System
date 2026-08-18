import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [serverIp, setServerIp] = useState('192.168.1.100'); // Dynamic IP Address state
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    const SERVER_URL = `http://${serverIp}:5000/api/scan_qr`; 
    
    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: memberId,
          qr_id: data,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        Alert.alert("Success", result.message || "Attendance logged successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to log attendance.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", `Could not connect to ${SERVER_URL}. Check your IP address and ensure the Flask server is running.`);
    }
    
    setIsScanning(false);
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.text}>No access to camera</Text></View>;
  }

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym Member App</Text>
      
      <View style={styles.card}>
        <View style={styles.networkConfig}>
            <Text style={styles.label}>Server IP Address:</Text>
            <TextInput 
              style={[styles.input, { marginBottom: 16 }]}
              value={serverIp}
              onChangeText={setServerIp}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
        </View>

        <Text style={styles.label}>Enter your Member ID:</Text>
        <TextInput 
          style={styles.input}
          value={memberId}
          onChangeText={setMemberId}
          placeholder="e.g. mem-1234-5678"
          placeholderTextColor="#888"
        />
        
        <TouchableOpacity 
          style={[styles.btn, (!memberId.trim() || !serverIp.trim()) && styles.btnDisabled]} 
          disabled={!memberId.trim() || !serverIp.trim()}
          onPress={() => {
            setScanned(false);
            setIsScanning(true);
          }}
        >
          <Text style={styles.btnText}>Scan QR for Attendance</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
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
    fontSize: 14,
    textTransform: 'uppercase',
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
  }
});
