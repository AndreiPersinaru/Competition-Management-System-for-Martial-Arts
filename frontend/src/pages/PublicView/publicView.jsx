import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const PublicView = () => {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [club1, setClub1] = useState("");
    const [club2, setClub2] = useState("");
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [time, setTime] = useState(300);

    useEffect(() => {
        const channel = new BroadcastChannel("match_channel");
        channel.onmessage = (event) => {
            const { metadata, type, score, penalties, time } = event.data;
            console.log("Received message:", event.data);
            
            if (type === "update") {
                if (metadata) {   
                    setPlayer1(metadata.playerNames[0] || "");
                    setPlayer2(metadata.playerNames[1] || "");
                    setClub1(metadata.clubs[0] || "");
                    setClub2(metadata.clubs[1] || "");
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

    const PlayerRow = ({ name, club, score, penalties, bgColor }) => (
        <Box height="38vh" position="relative" display="flex" alignItems="center" bgcolor={bgColor}>
            <Box width="100%" display="flex" flexDirection="column" pl={40}>
                <Typography fontSize="6vw">{name}</Typography>
                <Box display="flex">{renderPenalties(penalties)}</Box>
                <Typography fontSize="3vw">{club}</Typography>
            </Box>
            <Box position="absolute" right={40} top="50%" sx={{ transform: "translateY(-50%)" }}>
                <Typography fontSize="12vw">{score}</Typography>
            </Box>
        </Box>
    );

    return (
        <Box height="100vh">
            <PlayerRow name={player1} club={club1} score={score[0]} penalties={penalties[0]} bgColor="#198dd2" />
            <PlayerRow name={player2} club={club2} score={score[1]} penalties={penalties[1]} bgColor="white" />
            <Box height="24vh" bgcolor="black" color="white" display="flex" alignItems="center" justifyContent="center">
                <Typography fontSize="8vw">{formatTime(time)}</Typography>
            </Box>
        </Box>
    );
};

export default PublicView;