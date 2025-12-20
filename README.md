Overview

This project is a web application that helps generate trip routes and FMCSA-style ELD log sheets. The user enters basic trip details such as start, pickup, and dropoff locations, along with the driver’s current cycle hours and start time. The backend calculates the driving route using OpenRouteService, and when that is not available, it provides a fallback straight-line route.

Features

Create trips with start, pickup, and dropoff locations

Fetch driving routes using OpenRouteService (with automatic fallback)

Display the full route on an interactive map

Simulate Hours-of-Service behavior using a simple rules engine

Generate daily ELD log pages based on the trip timeline

Draw FMCSA-style grids with accurate status transitions

Combine all log pages into a downloadable PNG or PDF

How It Works

The user creates a trip by entering the locations and start time.

The backend retrieves a detailed route from OpenRouteService.

The app simulates driving, breaks, sleeper time, and duty status changes.

For each day of the trip, the system generates a log page with the proper grid lines and status transitions.

The user can preview the ELD logs inside the app and download them as PNG or PDF files.

Technology

Backend: Django REST Framework, Requests, ReportLab, Pillow

Frontend: React, Vite, Leaflet, HTML Canvas

Mapping: OpenRouteService routing API

Log Rendering: Custom canvas drawing of FMCSA-style daily logs

Purpose

The goal of this project is to demonstrate the ability to combine routing data, Hours-of-Service rules, and custom graphical rendering to produce accurate ELD log sheets automatically from trip input data.


<img width="934" height="719" alt="image" src="https://github.com/user-attachments/assets/4b573216-47ba-46a2-adc8-c03d47b635a5" />
<img width="911" height="916" alt="image" src="https://github.com/user-attachments/assets/8d97b83a-930f-4360-a7dd-a324d9e0cc23" />



For live overview
https://eld-othmane.netlify.app

