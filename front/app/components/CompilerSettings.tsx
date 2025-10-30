import React from 'react';
import './CompilerSettings.css';

interface CompilerSettingsProps {
  compilers: CompilerInfo[];
  selectedCompiler: string;
  onCompilerChange: (compiler: string) => void;
  config: BenchmarkConfig;
  onConfigChange: (config: BenchmarkConfig) => void;
  language: string;
}

export const CompilerSettings: React.FC<CompilerSettingsProps> = ({
  compilers,
  selectedCompiler,
  onCompilerChange,
  config,
  onConfigChange,
  language
}) => {
  const isAssembly = language === 'assembly';

  return (
    <div className="compiler-settings">
      <div className="setting-group">
        <label>Compiler:</label>
        <select 
          value={selectedCompiler} 
          onChange={(e) => onCompilerChange(e.target.value)}
        >
          {compilers.map(comp => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>

      {!isAssembly && (
        <>
          <div className="setting-group">
            <label>Optimization:</label>
            <select
              value={config.optimizationLevel}
              onChange={(e) =>
                onConfigChange({ ...config, optimizationLevel: e.target.value })
              }
            >
              <option value="-O0">-O0 (No optimization)</option>
              <option value="-O1">-O1</option>
              <option value="-O2">-O2 (Recommended)</option>
              <option value="-O3">-O3 (Aggressive)</option>
              <option value="-Os">-Os (Size)</option>
              <option value="-Ofast">-Ofast (Fastest)</option>
            </select>
          </div>

          {(language === 'cpp' || language === 'c') && (
            <div className="setting-group">
              <label>Standard:</label>
              <select
                value={config.standardVersion}
                onChange={(e) =>
                  onConfigChange({ ...config, standardVersion: e.target.value })
                }
              >
                {language === 'cpp' ? (
                  <>
                    <option value="-std=c++11">C++11</option>
                    <option value="-std=c++14">C++14</option>
                    <option value="-std=c++17">C++17</option>
                    <option value="-std=c++20">C++20</option>
                    <option value="-std=c++23">C++23</option>
                  </>
                ) : (
                  <>
                    <option value="-std=c99">C99</option>
                    <option value="-std=c11">C11</option>
                    <option value="-std=c17">C17</option>
                    <option value="-std=c2x">C2x</option>
                  </>
                )}
              </select>
            </div>
          )}

          <div className="setting-group">
            <label>Additional Flags:</label>
            <input
              type="text"
              value={config.additionalFlags}
              onChange={(e) =>
                onConfigChange({ ...config, additionalFlags: e.target.value })
              }
              placeholder="-Wall -Wextra"
            />
          </div>
        </>
      )}
    </div>
  );
};
