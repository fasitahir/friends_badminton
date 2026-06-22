import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wuplkiswlhxufirvlfpn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cGxraXN3bGh4dWZpcnZsZnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTM0NzksImV4cCI6MjA5NzY4OTQ3OX0.PZpUVFc9bbTKsDZVGKyoKGWRixk0gG31qfYtdQcMl7E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Fetching all players...");
  const { data: players, error: pErr } = await supabase.from('players').select('*');
  if (pErr) throw pErr;

  if (players.length < 4) {
    console.log("Need at least 4 players. Please use the app or test_seed.sql to add them.");
    return;
  }

  // Get first 4 players
  const [p1, p2, p3, p4] = players.slice(0, 4);

  console.log("Current Elos:");
  console.log(`${p1.name}: ${p1.elo_rating}`);
  console.log(`${p2.name}: ${p2.elo_rating}`);
  console.log(`${p3.name}: ${p3.elo_rating}`);
  console.log(`${p4.name}: ${p4.elo_rating}`);

  // Create a session
  console.log("\nCreating a test session...");
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .insert({ name: 'Elo Test Session', date: new Date().toISOString() })
    .select()
    .single();
  if (sErr) throw sErr;
  console.log(`Session created: ${session.id}`);

  // Pair 1: p1 & p2 (winners)
  // Pair 2: p3 & p4 (losers)
  console.log("\nCreating teams and pairs for the match...");
  const sortIds = (id1, id2) => id1 < id2 ? [id1, id2] : [id2, id1];
  const [t1p1, t1p2] = sortIds(p1.id, p2.id);
  const [t2p1, t2p2] = sortIds(p3.id, p4.id);

  // Insert teams
  const { data: dbTeam1, error: t1Err } = await supabase
    .from('teams')
    .insert({ session_id: session.id, name: `${p1.name} & ${p2.name}` })
    .select()
    .single();
  if (t1Err) throw t1Err;

  const { data: dbTeam2, error: t2Err } = await supabase
    .from('teams')
    .insert({ session_id: session.id, name: `${p3.name} & ${p4.name}` })
    .select()
    .single();
  if (t2Err) throw t2Err;

  // Insert team members
  const { error: tm1Err } = await supabase
    .from('team_members')
    .insert([
      { team_id: dbTeam1.id, player_id: p1.id },
      { team_id: dbTeam1.id, player_id: p2.id }
    ]);
  if (tm1Err) throw tm1Err;

  const { error: tm2Err } = await supabase
    .from('team_members')
    .insert([
      { team_id: dbTeam2.id, player_id: p3.id },
      { team_id: dbTeam2.id, player_id: p4.id }
    ]);
  if (tm2Err) throw tm2Err;

  // Insert pairs
  let { data: pair1, error: e1 } = await supabase.from('pairs').select().eq('player1_id', t1p1).eq('player2_id', t1p2).eq('session_id', session.id).single();
  if (!pair1) {
    const { data, error: e2 } = await supabase.from('pairs').insert({ player1_id: t1p1, player2_id: t1p2, session_id: session.id }).select().single();
    if (e2) console.error("Insert T1 pair error:", e2);
    pair1 = data;
  }
  let { data: pair2, error: e3 } = await supabase.from('pairs').select().eq('player1_id', t2p1).eq('player2_id', t2p2).eq('session_id', session.id).single();
  if (!pair2) {
    const { data, error: e4 } = await supabase.from('pairs').insert({ player1_id: t2p1, player2_id: t2p2, session_id: session.id }).select().single();
    if (e4) console.error("Insert T2 pair error:", e4);
    pair2 = data;
  }
  if (!pair1 || !pair2) {
    throw new Error("Pair creation failed");
  }

  const games = [
    {
      pair1_id: pair1.id,
      pair2_id: pair2.id,
      winning_pair_id: pair1.id,
      game_number: 1,
      pair1_score: 21,
      pair2_score: 15
    }
  ];

  console.log("\nRecording match with Elo...");
  const { data: rpcData, error: rpcErr } = await supabase.rpc('record_match_with_elo', {
    p_session_id: session.id,
    p_best_of: 1,
    p_team1_id: dbTeam1.id,
    p_team2_id: dbTeam2.id,
    p_winning_team_id: dbTeam1.id,
    p_games: games
  });

  if (rpcErr) {
    console.error("RPC Error:", rpcErr);
    return;
  }
  
  console.log("RPC Success! Returned Match ID:", rpcData);

  // Fetch updated players
  const { data: updatedPlayers } = await supabase.from('players').select('*').in('id', [p1.id, p2.id, p3.id, p4.id]);
  const up1 = updatedPlayers.find(p => p.id === p1.id);
  const up2 = updatedPlayers.find(p => p.id === p2.id);
  const up3 = updatedPlayers.find(p => p.id === p3.id);
  const up4 = updatedPlayers.find(p => p.id === p4.id);

  console.log("\nNew Elos (Addition & Subtraction):");
  console.log(`${up1.name}: ${up1.elo_rating} (Change: ${up1.elo_rating - p1.elo_rating})`);
  console.log(`${up2.name}: ${up2.elo_rating} (Change: ${up2.elo_rating - p2.elo_rating})`);
  console.log(`${up3.name}: ${up3.elo_rating} (Change: ${up3.elo_rating - p3.elo_rating})`);
  console.log(`${up4.name}: ${up4.elo_rating} (Change: ${up4.elo_rating - p4.elo_rating})`);
  
  console.log("\nDeleting the match to test Elo reversion...");
  const { error: delErr } = await supabase.rpc('delete_match_with_elo', {
    p_match_id: rpcData
  });
  if (delErr) {
    console.error("Reversion RPC Error:", delErr);
    return;
  }
  console.log("Delete RPC Success!");

  // Fetch players after reversion
  const { data: revertedPlayers } = await supabase.from('players').select('*').in('id', [p1.id, p2.id, p3.id, p4.id]);
  const rp1 = revertedPlayers.find(p => p.id === p1.id);
  const rp2 = revertedPlayers.find(p => p.id === p2.id);
  const rp3 = revertedPlayers.find(p => p.id === p3.id);
  const rp4 = revertedPlayers.find(p => p.id === p4.id);

  console.log("\nReverted Elos:");
  console.log(`${rp1.name}: ${rp1.elo_rating} (Change from start: ${rp1.elo_rating - p1.elo_rating})`);
  console.log(`${rp2.name}: ${rp2.elo_rating} (Change from start: ${rp2.elo_rating - p2.elo_rating})`);
  console.log(`${rp3.name}: ${rp3.elo_rating} (Change from start: ${rp3.elo_rating - p3.elo_rating})`);
  console.log(`${rp4.name}: ${rp4.elo_rating} (Change from start: ${rp4.elo_rating - p4.elo_rating})`);

  console.log("\nReversion Test successful!");
}

runTest().catch(console.error);
