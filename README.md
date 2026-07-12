# UrbanFlow Mobility

Projet fullstack pour un service de mobilité urbaine (stations, véhicules, trajets).

- **Frontend**: React + Vite (`frontend/`)
- **Backend**: Node.js + Express (`backend/`)
- **Database**: PostgreSQL

## Prérequis

- Node.js 18+
- PostgreSQL en local (ou accessible)

## Installation

### 1. Base de données

Créer la base PostgreSQL :

```bash
createdb urbanflow_mobility
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # ajuster les identifiants PostgreSQL si besoin
npm install
npm run db:migrate     # crée les tables (stations, vehicles, trips)
npm run dev            # démarre l'API sur http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # démarre l'app sur http://localhost:5173
```

Le frontend proxy les appels `/api/*` vers `http://localhost:4000` (voir `frontend/vite.config.js`).

## Structure

```
urban_flow/
├── frontend/          # React + Vite
└── backend/
    ├── src/
    │   ├── config/    # config PostgreSQL
    │   ├── controllers/
    │   ├── db/        # schema.sql + script de migration
    │   ├── middleware/
    │   ├── models/
    │   └── routes/
    └── .env.example
```

## API

| Méthode | Endpoint                | Description               |
|---------|--------------------------|---------------------------|
| GET     | `/api/health`            | Statut de l'API           |
| GET     | `/api/stations`          | Liste des stations        |
| POST    | `/api/stations`          | Créer une station         |
| DELETE  | `/api/stations/:id`      | Supprimer une station     |
| GET     | `/api/vehicles`          | Liste des véhicules       |
| POST    | `/api/vehicles`          | Créer un véhicule         |
| PATCH   | `/api/vehicles/:id/status` | Modifier le statut d'un véhicule |
| DELETE  | `/api/vehicles/:id`      | Supprimer un véhicule     |
