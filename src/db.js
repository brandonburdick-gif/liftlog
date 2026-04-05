import Dexie from 'dexie'

export const db = new Dexie('liftlog')

db.version(1).stores({
  workouts:  '++id, name, date, duration',
  exercises: '++id, workoutId, name, target, equipment, bodyPart, sort_order',
  sets:      '++id, exerciseId, weight, reps, isWarmup, isPR_1rm, isPR_vol, isPR_wt, sort_order'
})

// Save a completed workout and return the saved workout with its id
export async function saveWorkout(workout) {
  const workoutId = await db.workouts.add({
    name:     workout.name,
    date:     workout.date.toISOString(),
    duration: workout.duration || null,
  })
  for (const [exIdx, ex] of workout.exercises.entries()) {
    const exId = await db.exercises.add({
      workoutId,
      name:       ex.name,
      target:     ex.target,
      equipment:  ex.equipment,
      bodyPart:   ex.bodyPart,
      sort_order: exIdx,
    })
    for (const [setIdx, s] of ex.sets.entries()) {
      await db.sets.add({
        exerciseId: exId,
        weight:     parseFloat(s.weight) || 0,
        reps:       parseFloat(s.reps)   || 0,
        isWarmup:   s.isWarmup   || false,
        isPR_1rm:   s.isPR_1rm   || false,
        isPR_vol:   s.isPR_vol   || false,
        isPR_wt:    s.isPR_wt    || false,
        sort_order: setIdx,
      })
    }
  }
  return workoutId
}

// Load all workouts with their exercises and sets, newest first
export async function loadHistory() {
  const workouts  = await db.workouts.orderBy('date').reverse().toArray()
  const exercises = await db.exercises.toArray()
  const sets      = await db.sets.toArray()

  return workouts.map(w => ({
    ...w,
    date: new Date(w.date),
    exercises: exercises
      .filter(e => e.workoutId === w.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(e => ({
        ...e,
        sets: sets
          .filter(s => s.exerciseId === e.id)
          .sort((a, b) => a.sort_order - b.sort_order)
      }))
  }))
}

// Get best PRs per exercise across all history (for PR detection)
export async function getBestRecords() {
  const allSets     = await db.sets.toArray()
  const allExercises = await db.exercises.toArray()
  const records = {}
  for (const s of allSets) {
    const ex = allExercises.find(e => e.id === s.exerciseId)
    if (!ex || s.isWarmup) continue
    const key = ex.name
    if (!records[key]) records[key] = { best1rm: 0, bestVol: 0, bestWt: 0 }
    const rm  = s.reps === 1 ? s.weight : Math.round(s.weight * (1 + s.reps / 30))
    const vol = s.weight * s.reps
    if (rm  > records[key].best1rm) records[key].best1rm = rm
    if (vol > records[key].bestVol) records[key].bestVol = vol
    if (s.weight > records[key].bestWt) records[key].bestWt = s.weight
  }
  return records
}
