package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func main() {
	// Load .env if it exists
	_ = godotenv.Load()

	// Initialize Database
	initDB()
	defer db.Close()

	// Initialize Router
	r := gin.Default()

	// Basic CORS for frontend integration
	r.Use(cors.Default())

	// API Routes
	api := r.Group("/api")
	{
		api.GET("/health", healthCheck)
		api.GET("/agents", getAgents)
		
		// Phase 3 tasks
		// api.POST("/swarm/run", runSwarm)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "4891"
	}

	log.Printf("Kracked_Skills Agent Backend running on port %s", port)
	r.Run(":" + port)
}

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./kracked.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	log.Println("Database connection established")

	// Create tables if they don't exist
	createTablesSQL := `
	CREATE TABLE IF NOT EXISTS agents (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		role TEXT NOT NULL,
		level INTEGER DEFAULT 1,
		xp INTEGER DEFAULT 0
	);
	
	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		status TEXT DEFAULT 'setup',
		scale TEXT DEFAULT 'STANDARD',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE TABLE IF NOT EXISTS memory (
		id TEXT PRIMARY KEY,
		project_id TEXT,
		key TEXT NOT NULL,
		value TEXT,
		type TEXT DEFAULT 'local',
		FOREIGN KEY(project_id) REFERENCES projects(id)
	);
	`

	_, err = db.Exec(createTablesSQL)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}

	log.Println("Database tables initialized")
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "Kracked_Skills_Agent_Backend",
		"version": "1.0.0",
		"db_connected": db != nil,
	})
}

func getAgents(c *gin.Context) {
	rows, err := db.Query("SELECT id, name, role, level, xp FROM agents")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var agents []map[string]interface{}
	for rows.Next() {
		var id, name, role string
		var level, xp int
		if err := rows.Scan(&id, &name, &role, &level, &xp); err != nil {
			log.Println("Row scan error:", err)
			continue
		}
		agents = append(agents, map[string]interface{}{
			"id": id,
			"name": name,
			"role": role,
			"level": level,
			"xp": xp,
		})
	}

	c.JSON(http.StatusOK, gin.H{"agents": agents})
}
