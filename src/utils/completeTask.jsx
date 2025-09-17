import { ref, get, update } from "firebase/database";
import { db } from "../firebase";

export const completeTask = async (userId, taskXP) => {
  const userRef = ref(db, `users/${userId}`);
  const userSnap = await get(userRef);

  if (userSnap.exists()) {
    const data = userSnap.val();
    const newXP = (data.xp || 0) + taskXP;
    const newLevel = Math.floor(newXP / 100); // Customize level system if needed

    await update(userRef, {
      xp: newXP,
      level: newLevel,
      tasksCompleted: (data.tasksCompleted || 0) + 1,
    });
  }
};
