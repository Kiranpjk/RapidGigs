# Refresh Guide – How to Update Meta AI Authentication Tokens & GraphQL `doc_id`

Meta AI’s image and video generation endpoints rely on three session cookies and a dynamic `doc_id` that changes periodically.  
The steps below explain how to obtain fresh values and keep the SDK working.

---

## 1️⃣ Capture the three required cookies

1. **Open Meta AI** – Go to <https://www.meta.ai> and log in.  
2. **Open DevTools** – Press `F12` (or right‑click → *Inspect*).  
3. **Navigate to the *Application* tab** → *Cookies* → `https://www.meta.ai`.  
4. **Locate the following cookies** and copy their **full values**:

| Cookie | Purpose |
|--------|---------|
| `datr` | Device‑token (long‑lived) |
| `abra_sess` | Session identifier |
| `ecto_1_sess` | Primary authentication token (expires frequently) |

> **Tip:** You can also copy them via the *Network* tab → find any request to `graphql` → look at the *Request Cookies* header.

5. **Set them locally**  
   Create a `.env` file in the project root (or export them in your shell) using the `.env.example` template.

```dotenv
META_AI_DATR=YOUR_DATR_VALUE
META_AI_ABRA_SESS=YOUR_ABRA_SESS_VALUE
META_AI_ECTO_1_SESS=YOUR_ECTO_1_SESS_VALUE
```

---

## 2️⃣ Retrieve the `doc_id` for the desired operation

`doc_id` is a unique identifier for each GraphQL operation (image generation, video generation, etc.). It is **not public**, so you must capture it from a live browser request.

### Image Generation `doc_id`

1. In DevTools, switch to the **Network** tab and filter by **`graphql`**.  
2. Trigger an image generation in the Meta AI UI (enter a prompt, hit *Generate*).  
3. Find the POST request that contains `doc_id` in its form body (it will look like `doc_id=abcdef123456...`).  
4. Copy the value **exactly** as it appears.  
5. Open `src/metaai_sdk/image.py` and replace the placeholder `DOC_ID = "PLACEHOLDER_DOC_ID"` with the captured value.

### Video Generation `doc_id`

1. Repeat the same process but start a **video generation** (choose “Create video” or similar).  
2. Again, locate the POST request with `doc_id` and copy its value.  
3. Open `src/metaai_sdk/video.py` and replace the placeholder `DOC_ID = "PLACEHOLDER_DOC_ID"` with the captured value.  
4. Also verify the operation name used in the request body (commonly `GetVideoResult`). If it differs, update the hard‑coded `operation_name="GetVideoResult"` in `video.py`.

---

## 3️⃣ Refresh cadence

- **Cookies (`datr`, `abra_sess`, `ecto_1_sess`)** may expire after a few hours or when the browser session ends.  
  - If you receive a `CookieExpiredError`, repeat **Step 1** to obtain fresh cookies and update your `.env` file.  
- **`doc_id`** typically changes every few minutes.  
  - When generation starts failing with a GraphQL error mentioning “doc_id”, repeat **Step 2** to capture the new identifier and update the relevant file.

---

## 4️⃣ Optional: Automate (advanced)

Advanced users can script the cookie extraction using tools like **Puppeteer** or **Playwright**, but that is outside the scope of this SDK. The manual approach above is the most reliable way to keep the SDK functional.

---

### TL;DR

1. Grab `datr`, `abra_sess`, `ecto_1_sess` → put into `.env`.  
2. Capture the correct `doc_id` from the browser’s Network panel when generating an image or video.  
3. Replace the placeholder constants in `image.py` / `video.py`.  
4. Re‑run the SDK; if you hit an expiration error, go back to step 1.  

Happy generating! 🎨🚀