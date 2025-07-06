import React, { useState } from 'react';
import { ChevronDown, Activity, Cloud, Computer } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'cloud' | 'local' | 'medical';
  description?: string;
}

const models: AIModel[] = [
  // Medical Models
  { id: 'meditron:7b', name: 'Meditron 7B', provider: 'ollama', type: 'medical', description: 'Medical-specific LLM' },
  
  // Cloud Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', type: 'cloud' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', type: 'cloud' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', type: 'cloud' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', type: 'cloud' },
  
  // Local Models
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', provider: 'ollama', type: 'local' },
  { id: 'qwen2.5:0.5b', name: 'Qwen 2.5 0.5B', provider: 'ollama', type: 'local' },
  { id: 'mixtral:8x7b', name: 'Mixtral 8x7B', provider: 'ollama', type: 'local' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedModelData = models.find(m => m.id === selectedModel) || models[0];
  
  const getIcon = (type: string) => {
    switch(type) {
      case 'medical':
        return <Activity size={16} className="text-red-500" />;
      case 'cloud':
        return <Cloud size={16} className="text-blue-500" />;
      case 'local':
        return <Computer size={16} className="text-green-500" />;
      default:
        return null;
    }
  };
  
  const modelsByType = {
    medical: models.filter(m => m.type === 'medical'),
    cloud: models.filter(m => m.type === 'cloud'),
    local: models.filter(m => m.type === 'local'),
  };
  
  const handleSelect = (modelId: string) => {
    onModelSelect(modelId);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {getIcon(selectedModelData.type)}
        <span className="text-sm font-medium">{selectedModelData.name}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-md border border-gray-200 w-64 z-10 max-h-96 overflow-y-auto">
          {selectedModelData.type === 'medical' && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-700">Medical model with PubMed integration</p>
            </div>
          )}
          
          {Object.entries(modelsByType).map(([type, typeModels]) => {
            if (typeModels.length === 0) return null;
            
            return (
              <div key={type}>
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    {getIcon(type)}
                    <span className="text-xs font-medium text-gray-700 uppercase">{type}</span>
                  </div>
                </div>
                <ul>
                  {typeModels.map((model) => (
                    <li key={model.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          model.id === selectedModel ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                        onClick={() => handleSelect(model.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{model.name}</span>
                          <span className="text-xs text-gray-500">{model.provider}</span>
                        </div>
                        {model.description && (
                          <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;