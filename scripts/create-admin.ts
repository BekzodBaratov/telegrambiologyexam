import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

async function createAdmin() {
  const sql = neon(process.env.DATABASE_URL!)

  const email = "admin@example.com"
  const password = "admin123"
  const name = "Administrator"

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await sql`
      INSERT INTO admin_users (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name})
      ON CONFLICT (email) DO UPDATE SET password_hash = ${passwordHash}
    `
    console.log("Admin user created successfully!")
    console.log("Email:", email)
    console.log("Password:", password)
  } catch (error) {
    console.error("Error creating admin:", error)
  }
}

createAdmin()
