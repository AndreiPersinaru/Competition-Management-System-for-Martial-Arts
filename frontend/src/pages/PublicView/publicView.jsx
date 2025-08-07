import { Box, Typography } from "@mui/material";
import { useEffect, useState, useRef } from "react";

const PublicView = () => {
    const [player1, setPlayer1] = useState({ name: "", club: "" });
    const [player2, setPlayer2] = useState({ name: "", club: "" });
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [time, setTime] = useState(300);
    const [metadata, setMetadata] = useState({});
    const channelRef = useRef(null);

    const splitNameAndClub = (fullName) => {
        if (!fullName) return { name: "", club: "" };
        const match = fullName.match(/^(.+?)\s*\((.+)\)$/);
        if (match) return { name: match[1].trim(), club: match[2].trim() };
        return { name: fullName, club: "" };
    };

    useEffect(() => {
        channelRef.current = new BroadcastChannel("match_channel");

        const handleMessage = (event) => {
            const { metadata, type, score, penalties, time } = event.data;
            if (type === "update") {
                if (metadata && metadata.teams) {
                    setPlayer1(splitNameAndClub(metadata.teams[0]?.name || ""));
                    setPlayer2(splitNameAndClub(metadata.teams[1]?.name || ""));
                    setMetadata(metadata);
                }
                if (score) setScore(score);
                if (penalties) setPenalties(penalties);
                if (time !== undefined) setTime(time);
            }
        };

        channelRef.current.onmessage = handleMessage;

        window.addEventListener("load", () => {
            const requestChannel = new BroadcastChannel("match_request_channel");
            requestChannel.postMessage({ type: "request_data" });
            setTimeout(() => {
                requestChannel.close();
            }, 500);
        });

        return () => {
            if (channelRef.current) {
                channelRef.current.close();
            }
        };
    }, []);

    const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;

    const renderPenalties = (count) =>
        Array.from({ length: 4 }).map((_, i) => (
            <Box
                key={i}
                sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: i < count ? "red" : "transparent",
                    border: "2px solid black",
                    mx: 0.5,
                    boxShadow: i < count ? "0 0 10px red" : "none",
                    transition: "all 0.3s ease",
                }}
            />
        ));

    return (
        <Box height="100vh" position="relative" fontFamily="Arial, sans-serif">
            <Box
                height="40vh"
                display="flex"
                alignItems="center"
                bgcolor="#1565c0"
                position="relative"
                sx={{
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    transform: "perspective(1000px)",
                }}
            >
                <Box width="100%" display="flex" flexDirection="column" pl={"5vw"} pt={"8vh"} height="100%">
                    <Typography fontSize="4vw" fontWeight="bold" color="white" sx={{ textShadow: "2px 2px 8px black" }}>
                        {player1.name}
                    </Typography>
                    <Typography fontSize="2.5vw" fontWeight="medium" color="white" sx={{ textShadow: "1px 1px 4px black" }}>
                        {player1.club}
                    </Typography>
                    <Box display="flex" pt={"10vh"}>
                        {renderPenalties(penalties[0])}
                    </Box>
                </Box>
                <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%) scale(1.2)", color: "white" }}>
                    <Typography fontSize="12vw" fontWeight="bold" sx={{ textShadow: "3px 3px 10px black" }}>
                        {score[0]}
                    </Typography>
                </Box>
            </Box>

            <Box
                position="absolute"
                top="40%"
                left="50%"
                sx={{
                    transform: "translate(-50%, -50%) scale(1.1)",
                    background: "linear-gradient(145deg, #1e1e1e, #3c3c3c)",
                    color: "white",
                    borderRadius: "20px",
                    px: 30,
                    py: 1,
                    zIndex: 1,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
                }}
            >
                <Typography fontSize="6vw" fontWeight="bold" sx={{ textShadow: "2px 2px 5px black" }}>
                    {formatTime(time)}
                </Typography>
            </Box>

            <Box height="40vh" position="relative" display="flex" alignItems="center" bgcolor="white" sx={{ boxShadow: "0 -10px 30px rgba(0,0,0,0.3)" }}>
                <Box width="100%" display="flex" flexDirection="column" pl={"5vw"} pb={"8vh"} justifyContent="flex-end" height="100%">
                    <Box display="flex" pb={"10vh"}>
                        {renderPenalties(penalties[1])}
                    </Box>
                    <Typography
                        fontSize="2.5vw"
                        fontWeight="medium"
                        color="#111"
                        sx={{
                            textShadow: `
            1px 1px 2px #aaa,
            2px 2px 4px #bbb,
            -1px -1px 2px #fff
        `,
                        }}
                    >
                        {player2.club}
                    </Typography>

                    <Typography
                        fontSize="4vw"
                        fontWeight="bold"
                        color="#000"
                        sx={{
                            textShadow: `
            2px 2px 4px #999,
            0px 0px 6px #ccc,
            -2px -2px 2px #eee
        `,
                        }}
                    >
                        {player2.name}
                    </Typography>
                </Box>
                <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%) scale(1.2)", color: "#111" }}>
                    <Typography fontSize="12vw" fontWeight="bold" sx={{ textShadow: "2px 2px 8px rgba(0,0,0,0.3)" }}>
                        {score[1]}
                    </Typography>
                </Box>
            </Box>

            <Box
                height="20vh"
                bgcolor="#1c1c1c"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                sx={{
                    background: "linear-gradient(to right, #000, #1c1c1c)",
                }}
            >
                <Typography fontSize="3vw" color="red" sx={{ textShadow: "1px 1px 3px red" }}>
                    Campionatul National de Pangration Athlima
                </Typography>

                <Box display="flex" justifyContent="center" width="100%" gap={10}>
                    <Typography fontSize="2.5vw" color="red" sx={{ textShadow: "1px 1px 3px red" }}>
                        {metadata?.proba}
                    </Typography>
                    <Typography fontSize="2.5vw" color="red" sx={{ textShadow: "1px 1px 3px red" }}>
                        {metadata?.varsta} ani
                    </Typography>
                    <Typography fontSize="2.5vw" color="red" sx={{ textShadow: "1px 1px 3px red" }}>
                        {metadata?.greutate} KG
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default PublicView;
