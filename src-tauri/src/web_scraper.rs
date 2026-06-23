use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScrapedContent {
    pub url: String,
    pub title: String,
    pub markdown: String,
}

#[tauri::command]
pub async fn scrape_website(url: String) -> Result<ScrapedContent, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to fetch: {}", response.status()));
    }

    let html = response.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html);

    // Extract title
    let title_selector = Selector::parse("title").unwrap();
    let title = document.select(&title_selector).next().map(|t| t.text().collect::<Vec<_>>().join(" ")).unwrap_or_else(|| "No Title".to_string());

    // Extract relevant content to a markdown-like structure
    let content_selector = Selector::parse("p, h1, h2, h3, h4, h5, h6, li").unwrap();
    let mut markdown = String::new();

    for element in document.select(&content_selector) {
        let tag_name = element.value().name();
        let text: String = element.text().collect::<Vec<_>>().join(" ").trim().to_string();
        
        if text.is_empty() {
            continue;
        }

        match tag_name {
            "h1" => markdown.push_str(&format!("\n# {}\n\n", text)),
            "h2" => markdown.push_str(&format!("\n## {}\n\n", text)),
            "h3" => markdown.push_str(&format!("\n### {}\n\n", text)),
            "h4" => markdown.push_str(&format!("\n#### {}\n\n", text)),
            "h5" => markdown.push_str(&format!("\n##### {}\n\n", text)),
            "h6" => markdown.push_str(&format!("\n###### {}\n\n", text)),
            "li" => markdown.push_str(&format!("- {}\n", text)),
            "p" => markdown.push_str(&format!("{}\n\n", text)),
            _ => markdown.push_str(&format!("{}\n", text)),
        }
    }

    Ok(ScrapedContent {
        url,
        title,
        markdown: markdown.trim().to_string(),
    })
}

#[tauri::command]
pub async fn search_duckduckgo(query: String) -> Result<Vec<ScrapedContent>, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("https://html.duckduckgo.com/html/?q={}", urlencoding::encode(&query));
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html = response.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html);

    let result_selector = Selector::parse(".result__body").unwrap();
    let title_sel = Selector::parse(".result__title .result__a").unwrap();
    let snippet_sel = Selector::parse(".result__snippet").unwrap();

    let mut results = Vec::new();

    for result in document.select(&result_selector).take(5) {
        if let Some(title_el) = result.select(&title_sel).next() {
            let title = title_el.text().collect::<Vec<_>>().join("");
            let href = title_el.value().attr("href").unwrap_or("").to_string();
            
            let snippet = if let Some(snip_el) = result.select(&snippet_sel).next() {
                snip_el.text().collect::<Vec<_>>().join("")
            } else {
                "".to_string()
            };

            let mut clean_url = href.clone();
            if clean_url.starts_with("//duckduckgo.com/l/?uddg=") {
                clean_url = clean_url.replace("//duckduckgo.com/l/?uddg=", "");
                if let Ok(decoded) = urlencoding::decode(&clean_url) {
                    clean_url = decoded.split("&rut=").next().unwrap_or(&decoded).to_string();
                }
            }

            results.push(ScrapedContent {
                url: clean_url,
                title,
                markdown: snippet,
            });
        }
    }

    Ok(results)
}
