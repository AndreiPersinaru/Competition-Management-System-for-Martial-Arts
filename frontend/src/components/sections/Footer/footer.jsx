import React from "react";
import { Box, Container, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <Paper sx={{ bgcolor: "primary.main", color: "white" }}>
            <Container>
                <Box py={4} textAlign="center">
                    <Typography variant="body2">© 2025 Martial Arts Competitions Platform</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Contact: contact@email.ro | Tel: +40 712 345 678
                    </Typography>
                </Box>
            </Container>
        </Paper>
    );
};

export default Footer;
