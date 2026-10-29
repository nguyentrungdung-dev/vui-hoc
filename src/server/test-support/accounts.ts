import { createHash } from "node:crypto";
import { writeRecord } from "../account-store";
import { sessionKey } from "../accounts";
export async function testStudent(
  token = "a".repeat(64),
  id = createHash("sha256").update(token).digest("hex"),
) {
  await writeRecord("students", id, {
    id,
    username: id,
    nickname: "Bạn thử nghiệm",
    fullName: "Học sinh thử nghiệm",
    grade: 2,
    school: "",
    city: "",
    character: 4,
    dailyGoal: 1,
    passwordHash: "",
    salt: "",
  });
  await writeRecord("sessions", sessionKey(token), {
    accountId: id,
    expires: Date.now() + 3600000,
  });
  return `vuihoc-session=${token}`;
}
