import { getAllMemories } from '../storage/db.js';

export function memoriesCommand(tag?: string) {
  const memories = getAllMemories(tag);

  if (memories.length === 0) {
    if (tag) {
      console.log(`No compiled memories found with tag "${tag}".`);
    } else {
      console.log('No compiled memories found in any session.');
    }
    return;
  }

  console.log('\nMindDiff Memories Ledger' + (tag ? ` (Filtered by tag: "${tag}")` : '') + ':');
  console.log('='.repeat(90));

  for (const mem of memories) {
    const timeStr = new Date(mem.timestamp).toLocaleString();
    const tagNames = mem.inferred.tags.map(t => t.name).join(', ');
    const intent = mem.observed.summary || mem.inferred.intent || 'Analyze system state';

    console.log(`[${timeStr}] (${mem.sessionId.substring(0, 15)}...)`);
    console.log(`  Source: ${mem.source.toUpperCase()}`);
    console.log(`  Intent: ${intent}`);
    console.log(`  Tags:   ${tagNames}`);
    
    if (mem.inferred.constraints && mem.inferred.constraints.length > 0) {
      console.log(`  Alerts: ${mem.inferred.constraints.join('; ')}`);
    }
    console.log('-'.repeat(90));
  }
  console.log(`Total compiled memories: ${memories.length}\n`);
}
