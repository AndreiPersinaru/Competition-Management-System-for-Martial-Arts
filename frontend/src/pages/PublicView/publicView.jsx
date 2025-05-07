import { Box, Typography } from "@mui/material";

const PublicView = () => {
    const matchData = {
        player1: "Persinaru A.",
        player2: "Chirperean E.",
        club1: "Shin Daito",
        club2: "Davidans",
        score: [0, 0],
        time: 300,
        penalties: [2, 1],
    };

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
            <PlayerRow name={matchData.player1} club={matchData.club1} score={matchData.score[0]} penalties={matchData.penalties[0]} bgColor="#198dd2" />
            <PlayerRow name={matchData.player2} club={matchData.club2} score={matchData.score[1]} penalties={matchData.penalties[1]} bgColor="white" />
            <Box height="24vh" bgcolor="black" color="white" display="flex" alignItems="center" justifyContent="center">
                <Typography fontSize="8vw">{formatTime(matchData.time)}</Typography>
            </Box>
        </Box>
    );
};

export default PublicView;
