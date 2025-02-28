import { Box, Container, Typography, Chip } from "@mui/material";
import { EmojiEvents } from "@mui/icons-material";
import { useMemo } from "react";
import MatchCard from "../../components/custom/MatchCard/matchCard";

const generateParticipants = () => {
    const firstNames = ["Andrei", "Mihai", "Cristian", "Alexandru", "Gabriel", "Razvan", "Vlad", "Bogdan", "Radu", "Catalin"];
    const lastNames = ["Popescu", "Ionescu", "Dumitru", "Stanciu", "Radulescu", "Neagu", "Marin", "Tudor", "Dobre", "Florescu"];

    return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `${firstNames[i % 10]} ${lastNames[i % 10]}`,
        country: ["ROU", "FRA", "ITA", "ESP", "GER"][i % 5],
    }));
};

const generateRounds = (participants) => {
    const rounds = [];
    let currentRound = participants;
    let roundNumber = 1;

    while (currentRound.length > 1) {
        const matches = [];
        for (let i = 0; i < currentRound.length; i += 2) {
            const p1 = currentRound[i];
            const p2 = currentRound[i + 1];
            const score1 = Math.floor(Math.random() * 5);
            const score2 = Math.floor(Math.random() * 5);

            matches.push({
                id: `${roundNumber}-${i / 2}`,
                players: [p1, p2],
                score: [score1, score2],
                winner: score1 > score2 ? 0 : 1,
            });
        }

        rounds.push({
            name: `Round ${roundNumber}`,
            matches: matches,
            participantsCount: currentRound.length,
        });

        currentRound = matches.map((match) => match.players[match.winner]);
        roundNumber++;
    }

    return rounds;
};

const HorizontalTournament = () => {
    const participants = useMemo(() => generateParticipants(), []);
    const rounds = useMemo(() => generateRounds(participants), [participants]);

    return (
        <Container
            sx={{
                py: 4,
                maxWidth: { xs: "100%", lg: "xl" },
            }}
        >
            <Box textAlign="center" mb={4}>
                <Typography variant="h3">Turneu International Judo 2025</Typography>
                <Chip label={<Typography variant="body2">{`${participants.length} Participanți`}</Typography>} color="secondary" sx={{ mt: 2, px: 1 }} />
            </Box>

            {/* Structura orizontala */}
            <Box display={"flex"} py={1}>
                {rounds.map((round) => (
                    <Box
                        key={round.name}
                        sx={{
                            flex: 1,
                            minWidth: 380,
                            maxWidth: 380,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            mx: 1,
                            "&:not(:last-child)": {
                                borderRight: "2px dashed",
                            },
                        }}
                    >
                        <Typography variant="body2" align="center" gutterBottom fontWeight={"bold"}>
                            {round.name}
                            <br />({round.participantsCount} → {round.participantsCount / 2})
                        </Typography>

                        {round.matches.map((match) => (
                            <Box key={match.id} mb={2}>
                                <MatchCard players={match.players} score={match.score} winner={match.winner} />
                            </Box>
                        ))}
                    </Box>
                ))}

                {/* Castigator */}
                {rounds.length > 0 && (
                    <Box
                        sx={{
                            position: "sticky",
                            alignSelf: "center",
                            ml: 2,
                            borderRadius: 2,
                            p: 4,
                            boxShadow: 4,
                        }}
                    >
                        <EmojiEvents
                            sx={{
                                fontSize: 60,
                                color: "warning.main",
                                display: "block",
                                mx: "auto",
                            }}
                        />
                        <Typography variant="h5" align="center">
                            Campion
                        </Typography>
                        <Typography align="center">{rounds[rounds.length - 1].matches[0].players[rounds[rounds.length - 1].matches[0].winner].name}</Typography>
                        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: "block" }}>
                            Score: {rounds[rounds.length - 1].matches[0].score.join("-")}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Container>
    );
};

export default HorizontalTournament;
