import axios from "axios";

const ASSEMBLY_HEADERS = {
    authorization: process.env.REACT_APP_ASSEMBLY_AI_API_KEY, 
};

const pollTranscription = async (transcriptId) => {
    while (true) {
        const poll = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            { headers: ASSEMBLY_HEADERS }
        );

        if (poll.data.status === "completed") {
            return {
                text: poll.data.text,
                languageCode: poll.data.language_code
            };
        } else if (poll.data.status === "error") {
            throw new Error("Transcription failed");
        } else {
            await new Promise((r) => setTimeout(r, 3000));
        }
    }
};

export const transcribeAudio = async (audioUrl) => {
    try {
        const viRequest = {
            audio_url: audioUrl,
            language_code: "vi",
            punctuate: true,
            format_text: true,
        };

        let resVi = await axios.post(
            "https://api.assemblyai.com/v2/transcript",
            viRequest,
            { headers: ASSEMBLY_HEADERS }
        );

        let transcriptId = resVi.data.id;
        try {
            return await pollTranscription(transcriptId);
        } catch (err) {
            // Fallback to auto detection if Vietnamese fails or errors
            const autoRequest = {
                audio_url: audioUrl,
                language_detection: true,
                punctuate: true,
                format_text: true,
            };

            const autoRes = await axios.post(
                "https://api.assemblyai.com/v2/transcript",
                autoRequest,
                { headers: ASSEMBLY_HEADERS }
            );

            return await pollTranscription(autoRes.data.id);
        }
    } catch (err) {
        console.error("Transcription error:", err);
        throw err;
    }
};
