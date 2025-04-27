import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, Result, BarcodeFormat } from '@zxing/library';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CameraOff, Camera, Loader } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScan: (barcodeValue: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the barcode reader with the formats we want to detect
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128
    ];
    hints.set(2, formats);
    
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    
    startScanning();
    
    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (error) {
          console.error("Error resetting scanner:", error);
        }
      }
    };
  }, []);
  
  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current) return;
    
    setScanning(true);
    setError(null);
    
    try {
      await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: 'environment' }
        },
        videoRef.current,
        (result: Result | undefined, error: Error | undefined) => {
          if (result) {
            const barcodeValue = result.getText();
            console.log("Barcode detected:", barcodeValue);
            
            // Temporarily stop scanning to prevent multiple rapid detections
            setScanning(false);
            
            // Call the callback with the barcode value
            onScan(barcodeValue);
            
            // Vibrate for tactile feedback if supported
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            toast({
              title: "Barcode detected!",
              description: `Searching for product: ${barcodeValue}`,
            });
          }
          
          if (error && !(error instanceof TypeError)) {
            setError("Error scanning barcode. Please try again.");
            console.error("Scanner error:", error);
          }
        }
      );
      
      setCameraActive(true);
    } catch (err) {
      console.error("Failed to start camera:", err);
      setError("Could not access camera. Please check permissions and try again.");
      setCameraActive(false);
    }
  };
  
  const stopScanning = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
        setCameraActive(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };
  
  const toggleCamera = () => {
    if (cameraActive) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Scan Barcode</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ height: '300px' }}>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500 p-4 text-center">
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {!cameraActive && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">Camera is not active</p>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            className="h-full w-full object-cover"
            style={{ 
              display: cameraActive ? 'block' : 'none',
              transform: 'scaleX(-1)' // Mirror the camera feed for front-facing cameras
            }}
          />
          
          {cameraActive && (
            <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                <div className="absolute top-0 left-0 w-16 h-1 bg-green-500"></div>
                <div className="absolute top-0 left-0 w-1 h-16 bg-green-500"></div>
                <div className="absolute top-0 right-0 w-16 h-1 bg-green-500"></div>
                <div className="absolute top-0 right-0 w-1 h-16 bg-green-500"></div>
                <div className="absolute bottom-0 left-0 w-16 h-1 bg-green-500"></div>
                <div className="absolute bottom-0 left-0 w-1 h-16 bg-green-500"></div>
                <div className="absolute bottom-0 right-0 w-16 h-1 bg-green-500"></div>
                <div className="absolute bottom-0 right-0 w-1 h-16 bg-green-500"></div>
                {/* Scanning animation line */}
                {scanning && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-green-500"
                    style={{
                      animation: 'scanAnimation 2s ease-in-out infinite',
                    }}
                  ></div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-4 gap-4">
          <Button
            className={`flex items-center gap-2 ${cameraActive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'}`}
            onClick={toggleCamera}
          >
            {cameraActive ? (
              <>
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-4 text-center">
          Point your camera at a product barcode to scan it. Make sure the barcode is well-lit and centered in the frame.
        </p>
      </CardContent>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scanAnimation {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
        `
      }} />
    </Card>
  );
}

export default BarcodeScanner;