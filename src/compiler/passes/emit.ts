import { RawSegment } from './segment.js';
import { MemoryBlock, RawRef } from '../types.js';
import { inferCognition } from './infer.js';
import { randomUUID } from 'node:crypto';

/**
 * Pass 5: Memory Emission
 * Assigns unique IDs, resolves raw log byte offsets (rawRef), and structures each MemoryBlock.
 */
export function emitMemories(
  segments: RawSegment[],
  rawLog: string
): MemoryBlock[] {
  const memories: MemoryBlock[] = [];
  let lastByteOffset = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    
    // Perform sequential search in rawLog starting from lastByteOffset to calculate rawRef
    const firstLine = seg.text.split('\n')[0] || '';
    const segmentSample = firstLine.trim().substring(0, 30);
    
    let startByte = lastByteOffset;
    if (segmentSample.length > 0) {
      const indexInRaw = rawLog.indexOf(segmentSample, lastByteOffset);
      if (indexInRaw !== -1) {
        startByte = indexInRaw;
      }
    }
    
    // Estimate endByte by searching for the last line of the segment
    const lastLine = seg.text.split('\n').pop() || '';
    const lastLineSample = lastLine.trim().substring(0, 30);
    let endByte = startByte + seg.text.length;
    
    if (lastLineSample.length > 0) {
      const lastLineIndexInRaw = rawLog.indexOf(lastLineSample, startByte);
      if (lastLineIndexInRaw !== -1) {
        endByte = lastLineIndexInRaw + lastLineSample.length;
      }
    }

    // Edge cases and sanity limits
    if (endByte < startByte) {
      endByte = startByte + seg.text.length;
    }
    if (endByte > rawLog.length) {
      endByte = rawLog.length;
    }

    lastByteOffset = endByte;

    const rawRef: RawRef = {
      startByte,
      endByte
    };

    const inferred = inferCognition(seg);

    memories.push({
      id: `mem-${randomUUID().substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      source: seg.source,
      observed: {
        type: seg.observedType,
        summary: inferred.intent
      },
      inferred,
      text: seg.text,
      rawRef
    });
  }

  return memories;
}
