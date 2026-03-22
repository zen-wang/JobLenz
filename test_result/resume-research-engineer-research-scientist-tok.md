---
pages: 1
vars:
  tagline: "Research Engineer with expertise in building and optimizing large-scale ML systems, LLMs, and trustworthy AI for high-throughput, distributed environments."
---

# Wei-An Wang
wwang360@asu.edu

{{ tagline }}

## Projects

### Spotify Million Playlist Recommendation Engine || PySpark, Spark MLlib, ALS, Word2Vec, Python
- Engineered a hybrid recommendation ensemble (ALS collaborative filtering + Word2Vec sequential embeddings + popularity baseline) leveraging `PySpark` and `Spark MLlib` for **large-scale ETL** and distributed processing, achieving R-Precision 0.1816 — a 287.5% improvement over the popularity baseline.
- Architected a 5-stage `PySpark` batch pipeline for **large-scale ETL**, processing 33GB raw data through schema-driven ingestion, `Spark SQL` feature engineering, **distributed model training**, vectorized evaluation, and format-verified submission generation — completing end-to-end processing in ~75 minutes, demonstrating high **throughput**.
- Optimized offline evaluation from ~3 min/playlist to ~30ms (>5,000× speedup) by replacing Python dict-based scoring with vectorized `NumPy` index arrays, matrix multiplication, and `argpartition` top-K selection, significantly improving **efficiency**.
- Engineered track co-occurrence features via broadcast self-join on the 66M-row interaction table with 6 layered optimizations (top-10K pre-filtering, caching, inequality pruning, post-count thresholding), producing 15M co-occurrence pairs.
- Quantified the `Spark` vs. `pandas` scaling boundary: `pandas` matches `Spark` on simple aggregations but collapses on multi-table joins (81.2s vs 15.9s, 5.1× `Spark` advantage at 66M rows), validating **distributed processing** for **large-scale ML systems**.

### TrendScout AI: Hybrid RAG + Knowledge Graph || GPT-4, Gemini 2.0 Flash, Neo4j, ChromaDB, LangChain, Python
- Designed a hybrid `RAG` + Knowledge Graph retrieval system, demonstrating that **structured knowledge representation** significantly improves `LLM`-generated answer quality, outperforming `RAG`-only by 3× win rate (44% vs 14%) across 50 evaluation questions, contributing to more **steerable** and **trustworthy systems**.
- Built a complete `LLM`-as-judge **evaluation framework** with automated A/B testing, `Gemini 2.0 Flash` scoring on 3 axes (accuracy, completeness, relevance), and category-level breakdowns — establishing reproducible baselines for retrieval quality measurement, crucial for **trustworthy AI**.
- Engineered an `LLM`-powered entity extraction pipeline using `Gemini API` to convert 176 unstructured posts into a structured `Neo4j` knowledge graph with 560+ entities (7 node types, 8 relationship types), enabling scalable content understanding and enrichment.
- Architected a full-stack hybrid retrieval system combining `Neo4j` (`Cypher` queries) and `ChromaDB` (semantic search) with `GPT-4` synthesis, served via `Flask` with toggleable KG/RAG retrieval and source transparency.

### Elastic Face Recognition on AWS — Custom Autoscaling Cloud Application || AWS EC2, S3, SQS, PyTorch, Flask, Python
- Deployed a `PyTorch`-based face recognition model across up to 15 auto-scaled `AWS EC2` instances, achieving 100% classification accuracy with <1.2s average latency under 100 concurrent requests, demonstrating **high throughput** for **large-scale ML systems**.
- Implemented an end-to-end **ML serving pipeline** on `AWS`: image ingestion → `S3` storage → `SQS`-based job distribution → **distributed `PyTorch` inference** → result aggregation, designed for **fault tolerance** and scalability.
- Architected a multi-tier elastic cloud application on `AWS` with a custom autoscaling controller that dynamically scales 0–15 instances based on `SQS` queue depth, optimizing resource **efficiency** and **throughput**.
- Built a custom `AMI` packaging the complete inference environment (`PyTorch`, model weights, worker script) to enable rapid instance provisioning.

### Serverless & Edge Face Recognition Pipeline || AWS Lambda, ECR, IoT Greengrass, MQTT, Docker, PyTorch, Python
- Deployed a two-stage **ML inference pipeline** (`MTCNN` face detection → `InceptionResnetV1` recognition) as **containerized `Lambda` functions**, sharing a single `Docker` image via `ECR`, enhancing deployment **efficiency**.
- Architected an edge-cloud hybrid face recognition pipeline using `AWS IoT Greengrass` and `Lambda` connected via `SQS`, achieving 100/100 + bonus points with <2.5s avg latency, demonstrating robust **distributed system** performance and **efficiency**.
- Implemented edge-side "No-Face" short-circuit that bypasses cloud inference when no face is detected, reducing latency and conserving cloud resources.

### Cross-Modal Video Evidence Retrieval || CLIP, FAISS, PyTorch, Python
- Reduced `VLM` hallucination in video QA by building a cross-modal evidence retrieval pipeline using `CLIP` embeddings and `FAISS` indexing across 2,004 instructional videos, achieving 70.99% Top-10 evidence retrieval accuracy, contributing to more **trustworthy systems**.
- Designed temporal-aware reranking with answerability-adaptive weighting that dynamically adjusts text vs. image emphasis per query type, demonstrating that cross-modal fusion improves retrieval over single-modality approaches.
- Architected a modular retrieval pipeline: `FFmpeg`-based frame extraction → `CLIP` batch embedding (vision + text) → per-video `FAISS` indexing → Top-K retrieval → temporal reranking, processing 2,004 videos.

### Priority Matrix — Eisenhower Task Manager with AI Planning Agent || Electron, React 18, Claude API, OpenAI API, Ollama, Chart.js
- Built an `AI task planning agent` supporting 3 `LLM` backends (`Anthropic Claude`, `OpenAI GPT`, `Ollama` local models) with provider abstraction, achieving ~95% correct classification through **structured JSON output validation**, enhancing **steerability** and reliability.
- Implemented robust `LLM` response parsing handling reasoning model artifacts, markdown fence removal, and regex `JSON` extraction fallbacks with type-checked validation.
- Designed a human-in-the-loop preview-before-commit pattern where `AI` suggestions display in a review card with Edit/Add/Discard actions.

### Insurance Premium Prediction — SHAP-Informed Feature Engineering || XGBoost, LightGBM, CatBoost, SHAP, Optuna, scikit-learn, Python
- Built an **interpretable feature engineering pipeline** by applying `SHAP` interaction analysis and mutual information scoring to a 1.2M-record dataset, discovering that the dominant predictor had a 0.77 non-linear gap completely invisible to standard correlation analysis, crucial for **trustworthy AI**.
- Engineered 11 new features from `SHAP`-guided interaction pairs, non-linearity transformations, and K-Fold target encoding, expanding model capacity while removing 6 noise features confirmed by both `MI` and `SHAP` evidence.
- Uncovered hidden non-linear drivers by comparing mutual information against Pearson correlation across 22 features, revealing that the two strongest predictors showed near-zero linear correlation but high non-linear dependency.

### Real-Time Gesture Control Platform || MediaPipe, OpenCV, PyAutoGui, Python
- Developed a rotation-invariant hand gesture classifier on `MediaPipe`'s 21 3D landmarks using signed point-to-line-segment distance geometry, recognizing ~28 distinct gesture-to-command mappings — evolved through 3 algorithm iterations.
- Built a real-time perception-to-action pipeline processing 1920×1080 webcam frames at 43 FPS (23ms median latency, P95 < 25ms).

## Technical Skills

ML & AI
: `PySpark`, `Spark MLlib`, `Recommendation Systems`, `RAG Systems`, `LLM Evaluation`, `Knowledge Graphs`, `Content Enrichment`, `NLP`, `Computer Vision`, `Multimodal AI`, `Feature Engineering`, `Trustworthy AI`, `Interpretable ML`, `Distributed Systems`
Languages
: `Python`, `SQL`, `JavaScript`, `Java`, `C++`, `Scala`
Frameworks
: `PyTorch`, `scikit-learn`, `LangChain`, `FAISS`, `SHAP`, `Optuna`, `CLIP`, `OpenCV`, `MediaPipe`, `Pandas`, `NumPy`, `Flask`, `Electron`
Tools
: `Apache Spark`, `Neo4j`, `ChromaDB`, `Docker`, `Git`, `MySQL`, `PostgreSQL`, `Parquet`
Cloud
: `AWS EC2`, `AWS S3`, `AWS SQS`, `AWS Lambda`, `AWS IoT Greengrass`

## Education

### M.S. Computer Science || Arizona State University, Tempe, AZ
- GPA: 3.72/4.00
- Expected May 2026

### B.S. Computer Science & Information Engineering || Tamkang University, Taiwan
- 2019 - 2023
