interface PubMedArticle {
	pmid: string;
	title: string;
	abstract: string;
	authors: string[];
	journal: string;
	publicationDate: string;
	doi?: string;
}

interface PubMedSearchResult {
	count: number;
	articles: PubMedArticle[];
}

/**
 * Search PubMed for articles related to the query
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Array of PubMed articles
 */
export async function searchPubMed(
	query: string,
	limit = 5,
): Promise<PubMedSearchResult> {
	try {
		// Step 1: Search for article IDs
		const searchUrl = new URL(
			"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
		);
		searchUrl.searchParams.append("db", "pubmed");
		searchUrl.searchParams.append("term", query);
		searchUrl.searchParams.append("retmax", limit.toString());
		searchUrl.searchParams.append("retmode", "json");
		searchUrl.searchParams.append("sort", "relevance");

		const searchResponse = await fetch(searchUrl.toString());
		const searchData = await searchResponse.json();

		if (!searchData.esearchresult?.idlist?.length) {
			return { count: 0, articles: [] };
		}

		// Step 2: Fetch article details
		const ids = searchData.esearchresult.idlist;
		const summaryUrl = new URL(
			"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
		);
		summaryUrl.searchParams.append("db", "pubmed");
		summaryUrl.searchParams.append("id", ids.join(","));
		summaryUrl.searchParams.append("retmode", "json");

		const summaryResponse = await fetch(summaryUrl.toString());
		const summaryData = await summaryResponse.json();

		// Step 3: Parse articles
		const articles: PubMedArticle[] = [];

		for (const id of ids) {
			const article = summaryData.result?.[id];
			if (article) {
				articles.push({
					pmid: id,
					title: article.title || "",
					abstract: await fetchAbstract(id),
					authors: article.authors?.map((a: { name: string }) => a.name) || [],
					journal: article.fulljournalname || article.source || "",
					publicationDate: article.pubdate || "",
					doi: article.elocationid?.replace("doi: ", "") || undefined,
				});
			}
		}

		return {
			count: searchData.esearchresult.count,
			articles,
		};
	} catch (error) {
		console.error("PubMed search error:", error);
		throw new Error("Failed to search PubMed");
	}
}

/**
 * Fetch the abstract for a specific PubMed article
 * @param pmid The PubMed ID
 * @returns The article abstract
 */
async function fetchAbstract(pmid: string): Promise<string> {
	try {
		const abstractUrl = new URL(
			"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
		);
		abstractUrl.searchParams.append("db", "pubmed");
		abstractUrl.searchParams.append("id", pmid);
		abstractUrl.searchParams.append("retmode", "text");
		abstractUrl.searchParams.append("rettype", "abstract");

		const response = await fetch(abstractUrl.toString());
		const text = await response.text();

		// Extract abstract from the text response
		const abstractMatch = text.match(
			/(?:Abstract|ABSTRACT)\s*\n+([\s\S]+?)(?:\n\n|PMID:|$)/,
		);
		return abstractMatch?.[1]?.trim() || "";
	} catch (error) {
		console.error(`Failed to fetch abstract for PMID ${pmid}:`, error);
		return "";
	}
}

/**
 * Format PubMed articles as citations
 * @param articles Array of PubMed articles
 * @returns Formatted citation string
 */
export function formatCitations(articles: PubMedArticle[]): string {
	return articles
		.map((article, index) => {
			const authors = article.authors.slice(0, 3).join(", ");
			const etAl = article.authors.length > 3 ? ", et al." : "";
			const doi = article.doi ? ` DOI: ${article.doi}` : "";

			return `[${index + 1}] ${authors}${etAl} "${article.title}" ${article.journal}. ${article.publicationDate}. PMID: ${article.pmid}${doi}`;
		})
		.join("\n\n");
}

/**
 * Check if a query likely needs PubMed search
 * @param query The user's query
 * @returns Whether to search PubMed
 */
export function shouldSearchPubMed(query: string): boolean {
	const researchKeywords = [
		"research",
		"study",
		"studies",
		"clinical trial",
		"evidence",
		"literature",
		"papers",
		"publications",
		"latest",
		"recent",
		"findings",
		"meta-analysis",
		"systematic review",
		"randomized",
		"RCT",
		"cohort",
		"case-control",
		"effectiveness",
		"efficacy",
		"outcomes",
		"guidelines",
		"recommendations",
	];

	const queryLower = query.toLowerCase();
	return researchKeywords.some((keyword) => queryLower.includes(keyword));
}
