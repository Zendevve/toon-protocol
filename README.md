# TOON Protocol Interface

A futuristic, brutalist web interface for generating and visualizing Token-Oriented Object Notation (TOON) data. This tool aids developers in creating token-efficient datasets for LLM interactions.

## Capabilities

- **Synthetic Data Generation**: Utilizes the Gemini API to generate structured datasets from natural language.
- **TOON Encoder/Decoder**: specific implementation of the TOON specification for encoding JSON and decoding TOON streams.
- **Deep Visualization**: Interactive "Data Topology" map allowing inspection of nested structures and tabular data.
- **Token Analytics**: Real-time stats showing compression rates between JSON and TOON.
- **Export**: Supports .toon, .json, .md, and .txt exports.

## Architecture

- **Frontend**: React 19, Tailwind CSS
- **Typography**: Space Grotesk (UI), Space Mono (Code)
- **AI Engine**: Google GenAI SDK (Gemini 2.5 Flash)

## Usage

Enter a prompt in the input matrix (e.g., "A dataset of cyberpunk inventory items") and initiate the sequence to generate data. Use the toggle views to inspect the output formats and verify structural integrity via the visualizer.
