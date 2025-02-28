import { Paper, Box, Typography, Chip } from "@mui/material";
import PropTypes from "prop-types";

const MatchCard = ({ players, score, winner, onClick }) => {
    return (
        <Paper
            elevation={2}
            onClick={onClick}
            sx={{
                p: 1,
                m: 1,
                border: "1px solid",
                transition: "transform 0.2s",
                cursor: onClick ? "pointer" : "default",
                "&:hover": {
                    transform: "scale(1.02)",
                    boxShadow: 4,
                },
            }}
        >
            {players.map((player, idx) => (
                <Box
                    key={player.id}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 0.5,
                        bgcolor: winner === idx ? "primary.light" : "white",
                        borderRadius: "4px",
                        px: 1,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: winner === idx ? "bold" : "normal",
                            }}
                        >
                            {player.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {player.country} • #{player.id}
                        </Typography>
                    </Box>
                    <Chip label={score[idx]} color="primary" sx={{ minWidth: "32px" }} />
                </Box>
            ))}
        </Paper>
    );
};

MatchCard.propTypes = {
    players: PropTypes.array.isRequired,
    score: PropTypes.array.isRequired,
    winner: PropTypes.number.isRequired,
    onClick: PropTypes.func,
};

export default MatchCard;
