export interface Tag {
  name: string;
  confidence: number;
}

export interface ObservedFacts {
  type: string;
  action?: string;
  command?: string;
  exitCode?: number;
  summary?: string;
  [key: string]: any;
}

export interface InferredCognition {
  intent?: string;
  tags: Tag[];
  constraints?: string[];
  [key: string]: any;
}

export interface RawRef {
  startByte: number;
  endByte: number;
}

export interface MemoryBlock {
  id: string;
  timestamp: string;
  source: 'user' | 'agent' | 'system';
  observed: ObservedFacts;
  inferred: InferredCognition;
  text: string;
  rawRef: RawRef;
}

export interface MemoryLedger {
  compilerVersion: string;
  schemaVersion: string;
  memories: MemoryBlock[];
}
