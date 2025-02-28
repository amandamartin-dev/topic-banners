import Component from "@glimmer/component";
import { htmlSafe } from "@ember/template";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { ajax } from "discourse/lib/ajax";

export default class CustomBlocks extends Component {

  get blocksToDisplay() {
    const tags = this.args.outletArgs?.topic?.tags || [];
    let blocks = [];

    try {
      if (typeof settings.blocks === "string") {
        blocks = JSON.parse(settings.blocks || "[]");
      } else if (Array.isArray(settings.blocks)) {
        blocks = settings.blocks;
      }
    } catch (e) {
      console.error("Error parsing theme settings for 'blocks':", e);
    }

    return blocks
      .filter((block) => block.tags?.some((tag) => tags.includes(tag)))
      .map((block) => {
        return {
          content: htmlSafe(block.html),
          placementID: block.placementID,
          campaignID: block.campaignID,
        };
      });
  }


@action
  handleBlockClick(block, event) {
     
    const apiEndpoint = settings.api_endpoint;

    if (!apiEndpoint) {
      console.warn("API endpoint is not configured.");
      return;
    }

    const payload = {
      placementID: block.placementID,
      campaignID: block.campaignID
    };

    ajax(apiEndpoint, {
      method: "POST",
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "referrer": document.referrer
      },
    })
      .then((response) => {
        const href = event.target.getAttribute('href'); 
        if (href) {
          const router = getOwner(this).lookup("router:main");
          const url = new URL(href);
          const path = url.pathname + url.search;
          router.transitionTo(path);
        }
      })
      .catch((error) => {
        let errorMessage = "Unknown error occurred.";
      if (error.jqXHR.responseJSON) {
        errorMessage = error.jqXHR.responseJSON.error || JSON.stringify(error.responseJSON);
      } else if (error.responseText) {
        errorMessage = error.responseText;
      }
        this.createErrorPost({
          origin: window.location.origin,
          placementID: block.placementID ? block.placementID : "none provided",
          campaignID: block.campaignID ? block.campaignID : "none provided",
          message: errorMessage,
        });
      }
    );
  }

  createErrorPost({ origin, placementID, campaignID, message }) {
    const apiKey = settings.api_key;  
    const apiUsername = "system"; 
    const categoryID = settings.category_id; 
    
  
    if (!apiKey || !categoryID) {
      console.warn("API key or category ID is not configured.");
      return;
    }
  
    const topicTitle = `API Error Report: ${placementID || "Unknown Placement ID"}`;
    const topicBody = `
      **Error Details**:
      - **Origin**: ${origin}
      - **Placement ID**: ${placementID}
      - **Campaign ID**: ${campaignID}
      - **Error Message**: ${message}
    `;
  
    ajax("/posts", {
      method: "POST",
      data: {
        title: topicTitle,
        raw: topicBody,
        category: categoryID,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Api-Key": apiKey,
        "Api-Username": apiUsername,
      },
    })
      .then((response) => {
        
      })
      .catch((error) => {
        console.error("Failed to create error notification topic:", error);
      });
    }
  }
