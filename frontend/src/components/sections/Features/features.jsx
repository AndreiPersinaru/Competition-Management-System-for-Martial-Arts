import React from "react";
import { Box, Container, Typography, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { EventAvailable, EmojiEvents, ListAlt } from "@mui/icons-material";

const Features = () => {
    const whatWeOffer = [
        {
            icon: <EventAvailable fontSize="large" />,
            title: "Înscrieri Online",
            text: "Sistem simplu de înscriere cu plata integrată",
        },
        {
            icon: <EmojiEvents fontSize="large" />,
            title: "Clasamente Live",
            text: "Urmărește rezultatele în timp real",
        },
        {
            icon: <ListAlt fontSize="large" />,
            title: "Programări",
            text: "Orar competiții și categorii de vârstă",
        },
    ];

    return (
        <Box sx={{ pt: 8, pb: 16 }}>
                <Container>
                    <Typography variant="h4" align="center" sx={{ mb: 4 }}>
                        Ce oferim
                    </Typography>
                    <Grid container spacing={4}>
                        {whatWeOffer.map((feature, index) => (
                            <Grid mb={{ xs: 4, md: 0 }} size={{ xs: 12, md: 4 }} key={index}>
                                <Paper elevation={4} sx={{ p: 2, height: "100%" }}>
                                    <Box sx={{ textAlign: "center", mb: 2 }}>{feature.icon}</Box>
                                    <Typography variant="h5" align="center" gutterBottom>
                                        {feature.title}
                                    </Typography>
                                    <Typography align="center">{feature.text}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
    );
};

export default Features;