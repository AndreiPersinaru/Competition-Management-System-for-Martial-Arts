import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const PublicView = () => {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [time, setTime] = useState(300);
    const [metadata, setMetadata] = useState({});

    useEffect(() => {
        const channel = new BroadcastChannel("match_channel");
        channel.onmessage = (event) => {
            const { metadata, type, score, penalties, time } = event.data;
            console.log("Received message:", event.data);

            if (type === "update") {
                if (metadata) {
                    setPlayer1(metadata.teams[0]?.name || "");
                    setPlayer2(metadata.teams[1]?.name || "");
                }

                if (metadata) setMetadata(metadata);
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

    const PlayerRow = ({ name, score, penalties, bgColor }) => (
        <Box height="40vh" position="relative" display="flex" alignItems="center" bgcolor={bgColor}>
            <Box width="100%" display="flex" flexDirection="column" pl={20}>
                <Typography fontSize="4vw" fontWeight="bold">
                    {name}
                </Typography>
                <Box display="flex">{renderPenalties(penalties)}</Box>
            </Box>
            <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%)" }}>
                <Typography fontSize="12vw">{score}</Typography>
            </Box>
        </Box>
    );

    return (
        <Box height="100vh" position="relative">
            <Box height="20vh" bgcolor="black" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
                <Typography fontSize="3vw" color="white">
                    Campionatul National de Pangration Athlima
                </Typography>

                <Box display="flex" justifyContent="center" width="100%" gap={10}>
                    <Typography fontSize="2.5vw" color="white">
                        {metadata?.proba}
                    </Typography>
                    <Typography fontSize="2.5vw" color="white">
                        {metadata?.varsta} ani
                    </Typography>
                    <Typography fontSize="2.5vw" color="white">
                        {metadata?.greutate} KG
                    </Typography>
                </Box>
            </Box>
            <PlayerRow name={player1} score={score[0]} penalties={penalties[0]} bgColor="#198dd2" />
            <Box
                position="absolute"
                top="60%"
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

            <PlayerRow name={player2} score={score[1]} penalties={penalties[1]} bgColor="white" />
        </Box>
    );
};

export default PublicView;
