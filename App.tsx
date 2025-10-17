import React, { useState, useCallback, useEffect } from 'react';
import { PredictedNumbers, LotteryConfig, AIStrategy, AnalysisResults, HitScore } from './types';
import { predictWinningNumbers, extractNumbersFromImage, cleanAndFormatData } from './services/geminiService';
import Header from './components/Header';
import NumberDisplay from './components/NumberDisplay';
import Disclaimer from './components/Disclaimer';
import { sampleData, SA_LOTTERY_PRESETS } from './constants';
import LotteryConfigurator from './components/LotteryConfigurator';
import DataInput from './components/DataInput';
import AnalysisDisplay from './components/AnalysisDisplay';
import { analyzeHistoricalData } from './utils/dataAnalysis';
import DataVisualization from './components/DataVisualization';
import Tabber from './components/Tabber';
import PerformanceTracker from './components/PerformanceTracker';
import AIStrategySelector from './components/AIStrategySelector';

const App: React.FC = () => {
  const [config, setConfig] = useState<LotteryConfig>(SA_LOTTERY_PRESETS['SA PowerBall']);
  const [historicalData, setHistoricalData] = useState<string>(sampleData);
  const [predictedNumbers, setPredictedNumbers] = useState<PredictedNumbers | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [aiStrategy, setAiStrategy] = useState<AIStrategy>('balanced');
  const [hitScore, setHitScore] = useState<HitScore | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  // Fix: API key is now handled exclusively via environment variables.
  const hasApiKey = !!process.env.API_KEY;

  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  useEffect(() => {
    if (historicalData) {
      const results = analyzeHistoricalData(historicalData, config);
      setAnalysisResults(results);
    } else {
      setAnalysisResults(null);
    }
  }, [historicalData, config]);

  const handleScanImage = useCallback(async (imageFile: File) => {
    if (!hasApiKey) {
        setError('API key is not configured. Please configure it in your deployment environment.');
        return;
    }
    setIsScanning(true);
    setError('');
    setHitScore(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        // Fix: Removed API key parameter from service call.
        const extractedText = await extractNumbersFromImage(base64Data, imageFile.type);
        setHistoricalData(prevData => `${prevData}\n${extractedText}`.trim());
      };
      reader.readAsDataURL(imageFile);
    } catch (err) {
      setError('Failed to scan image. Please try again or enter data manually.');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  }, [hasApiKey]);

  const handleCleanData = useCallback(async () => {
    if (!historicalData.trim()) return;
    if (!hasApiKey) {
        setError('API key is not configured. Please configure it in your deployment environment.');
        return;
    }
    setIsCleaning(true);
    setError('');
    setHitScore(null);
    try {
        // Fix: Removed API key parameter from service call.
        const cleanedData = await cleanAndFormatData(historicalData);
        setHistoricalData(cleanedData);
    } catch (err) {
        setError('AI failed to clean data. Please check the pasted content or format it manually.');
        console.error(err);
    } finally {
        setIsCleaning(false);
    }
  }, [historicalData, hasApiKey]);
  
  const handlePredict = useCallback(async () => {
    if (!hasApiKey) {
        setError('API key is not configured. Please configure it in your deployment environment to generate numbers.');
        return;
    }
    if (!historicalData.trim()) {
      setError('Historical data cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');
    setPredictedNumbers(null);
    setHitScore(null);
    try {
      // Fix: Removed API key parameter from service call.
      const result = await predictWinningNumbers(historicalData, config, aiStrategy);
      setPredictedNumbers(result);
    } catch (err) {
      setError('Failed to get prediction. Please check your data/config or try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [historicalData, config, aiStrategy, hasApiKey]);

  const handlePresetChange = (presetKey: string) => {
    if (presetKey in SA_LOTTERY_PRESETS) {
      setConfig(SA_LOTTERY_PRESETS[presetKey]);
      setHitScore(null);
      setPredictedNumbers(null);
    }
  };

  const handleCheckScore = (actualMain: number[], actualSpecial: number[]) => {
    if (!predictedNumbers) return;
    
    const mainHits = predictedNumbers.mainNumbers.filter(num => actualMain.includes(num));
    const specialHits = predictedNumbers.specialNumbers.filter(num => actualSpecial.includes(num));

    setHitScore({ mainHits, specialHits });
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    // The type assertion is necessary because the base Event type doesn't have prompt()
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    // prompt() can only be called once.
    await promptEvent.userChoice;
    setInstallPrompt(null);
  };

  const isAiDisabled = isLoading || isScanning || isCleaning || !isOnline || !hasApiKey;
  let generateButtonText = 'Generate High-Probability Numbers';
  if (isLoading) {
    generateButtonText = 'Analyzing...';
  } else if (!isOnline) {
    generateButtonText = 'Connect to Generate';
  } else if (!hasApiKey) {
    // Fix: Updated button text to reflect environment variable requirement.
    generateButtonText = 'API Key Not Configured';
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      {/* Fix: Removed ApiKeyModal component. */}
      <div className="w-full max-w-5xl mx-auto">
        <Header 
            onInstallClick={handleInstallApp} 
            showInstallButton={!!installPrompt}
            // Fix: Removed onManageKeyClick prop.
        />
        
        {!isOnline && (
            <div className="my-4 p-3 text-center bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm animate-fade-in">
                You are currently offline. AI features are disabled.
            </div>
        )}

        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Config & Input */}
          <div className="space-y-8">
            <LotteryConfigurator 
              config={config} 
              setConfig={setConfig}
              onPresetChange={handlePresetChange}
            />
            <Tabber
              tabs={{
                'Data Input': (
                  <DataInput
                    historicalData={historicalData}
                    setHistoricalData={(data) => {
                      setHistoricalData(data);
                      setHitScore(null);
                      setPredictedNumbers(null);
                    }}
                    onScanImage={handleScanImage}
                    isScanning={isScanning}
                    onCleanData={handleCleanData}
                    isCleaning={isCleaning}
                    isOnline={isOnline}
                    hasApiKey={hasApiKey}
                  />
                ),
                'Data Analysis': <DataVisualization results={analysisResults} />,
              }}
            />
          </div>

          {/* Right Column: Action & Results */}
          <div className="space-y-8">
            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-sm border border-slate-700">
               <h2 className="text-xl font-semibold text-cyan-300 mb-4">3. Generate Your Numbers</h2>
                <p className="text-sm text-slate-400 mb-6">
                 Choose an AI strategy, then let the AI work its magic.
                </p>
                <AIStrategySelector selectedStrategy={aiStrategy} onStrategyChange={setAiStrategy} />
              <button
                onClick={handlePredict}
                disabled={isAiDisabled}
                className="w-full mt-6 inline-flex items-center justify-center px-8 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold rounded-full shadow-lg hover:shadow-cyan-500/30 transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
              >
                {generateButtonText}
              </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-sm border border-slate-700 min-h-[300px] flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-cyan-300 mb-4 text-center">AI Prediction Results</h2>
              <div className="flex-grow flex items-center justify-center">
                 {isLoading && <div className="text-center text-slate-400">The AI is thinking...</div>}
                 {error && <p className="text-red-400 bg-red-900/30 p-4 rounded-lg">{error}</p>}
                 {predictedNumbers && !isLoading && (
                   <div className="w-full animate-fade-in">
                     <NumberDisplay 
                        numbers={predictedNumbers} 
                        specialBallName={config.specialName || 'Bonus'}
                        hitScore={hitScore}
                     />
                     <AnalysisDisplay explanation={predictedNumbers.explanation} />
                     <PerformanceTracker 
                        config={config} 
                        onCheckScore={handleCheckScore}
                        predictedNumbers={predictedNumbers}
                     />
                   </div>
                 )}
                 {!isLoading && !error && !predictedNumbers && (
                    <div className="text-center text-slate-500">
                        <p>Your predicted numbers and analysis will appear here.</p>
                        {/* Fix: Updated placeholder text for missing API key. */}
                        {!hasApiKey && <p className="mt-2 text-yellow-400">Please deploy this app and set your API key in the environment variables to begin.</p>}
                    </div>
                 )}
              </div>
            </div>
          </div>
        </main>

        <Disclaimer />
      </div>
    </div>
  );
};

export default App;
