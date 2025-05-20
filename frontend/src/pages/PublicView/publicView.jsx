import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const PublicView = () => {
    const [player1, setPlayer1] = useState({ name: "", club: "" });
    const [player2, setPlayer2] = useState({ name: "", club: "" });
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [time, setTime] = useState(300);
    const [metadata, setMetadata] = useState({});

    const splitNameAndClub = (fullName) => {
        const match = fullName.match(/^(.+?)\s*\((.+)\)$/);
        if (match) return { name: match[1].trim(), club: match[2].trim() };
        return { name: fullName, club: "" };
    };

    useEffect(() => {
        const channel = new BroadcastChannel("match_channel");
        channel.onmessage = (event) => {
            const { metadata, type, score, penalties, time } = event.data;
            console.log("Received message:", event.data);

            if (type === "update") {
                if (metadata) {
                    setPlayer1(splitNameAndClub(metadata.teams[0]?.name || ""));
                    setPlayer2(splitNameAndClub(metadata.teams[1]?.name || ""));
                    setMetadata(metadata);
                }

                if (score) setScore(score);
                if (penalties) setPenalties(penalties);
                if (time !== undefined) setTime(time);
            }
        };

        return () => channel.close();
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
                }}
            />
        ));

    return (
        <Box height="100vh" position="relative">
            <Box height="40vh" position="relative" display="flex" alignItems="center" bgcolor="#198dd2">
                <Box width="100%" display="flex" flexDirection="column" pl={20} pt={"8vh"} justifyContent="flex-start" height="100%">
                    <Typography fontSize="4vw" fontWeight="bold">
                        {player1.name}
                    </Typography>
                    <Typography fontSize="2.5vw" fontWeight="medium">
                        {player1.club}
                    </Typography>
                    <Box display="flex" pt={"10vh"}>
                        {renderPenalties(penalties[0])}
                    </Box>
                </Box>
                <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%)" }}>
                    <Typography fontSize="12vw">{score[0]}</Typography>
                </Box>
            </Box>

            <Box
                position="absolute"
                top="40%"
                left="50%"
                sx={{
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "white",
                    borderRadius: "16px",
                    px: 30,
                    zIndex: 1,
                }}
            >
                <Typography fontSize="6vw" fontWeight="bold">
                    {formatTime(time)}
                </Typography>
            </Box>

            <Box height="40vh" position="relative" display="flex" alignItems="center" bgcolor="white">
                <Box width="100%" display="flex" flexDirection="column" pl={20} pb={"8vh"} justifyContent="flex-end" height="100%">
                    <Box display="flex" pb={"10vh"}>
                        {renderPenalties(penalties[1])}
                    </Box>
                    <Typography fontSize="2.5vw" fontWeight="medium">
                        {player2.club}
                    </Typography>
                    <Typography fontSize="4vw" fontWeight="bold">
                        {player2.name}
                    </Typography>
                </Box>
                <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%)" }}>
                    <Typography fontSize="12vw">{score[1]}</Typography>
                </Box>
            </Box>

            <Box height="20vh" bgcolor="black" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
                <Typography fontSize="3vw" color="red">
                    Campionatul National de Pangration Athlima
                </Typography>

                <Box display="flex" justifyContent="center" width="100%" gap={10}>
                    <Typography fontSize="2.5vw" color="red">
                        {metadata?.proba}
                    </Typography>
                    <Typography fontSize="2.5vw" color="red">
                        {metadata?.varsta} ani
                    </Typography>
                    <Typography fontSize="2.5vw" color="red">
                        {metadata?.greutate} KG
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default PublicView;
