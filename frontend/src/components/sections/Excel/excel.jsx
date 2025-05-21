import { Box, Typography, Button, Paper, CircularProgress, Alert, Snackbar } from "@mui/material";
import { useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import axios from "axios";
import API_URL from "../../../config";

const Excel = () => {
    const params = useParams();
    const competitionId = params.id;
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [errorDetails, setErrorDetails] = useState([]);
    const fileInputRef = useRef(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    }, []);

    const handleFileChange = (e) => {
        validateAndSetFile(e.target.files[0]);
    };

    const validateAndSetFile = (file) => {
        if (!file) return;

        const fileExtension = file.name.split(".").pop().toLowerCase();
        if (!["xlsx", "xls"].includes(fileExtension)) {
            showSnackbar("Formatul fișierului nu este acceptat. Te rugăm să încărci un fișier Excel (.xlsx sau .xls).", "error");
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showSnackbar("Fișierul este prea mare. Dimensiunea maximă acceptată este 5MB.", "error");
            return;
        }

        setFile(file);
        showSnackbar(`Fișier selectat: ${file.name}`, "info");
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const downloadTemplate = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(`${API_URL}/competitii/${competitionId}/template/`, {
                responseType: "blob",
                headers,
            });

            const disposition = response.headers["content-disposition"];
            const filenameMatch = disposition && disposition.match(/filename\*=UTF-8''(.+)/);
            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "template.xlsx";

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSnackbar("Template Excel descărcat cu succes!", "success");
        } catch (error) {
            console.error("Eroare la descărcarea template-ului:", error);
            showSnackbar("Eroare la descărcarea template-ului. Te rugăm să încerci din nou.", "error");
        }
    };

    const downloadList = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/competitii/${competitionId}/export-participants/`, {
                responseType: "blob",
                headers,
            });

            const disposition = response.headers["content-disposition"];
            const filenameMatch = disposition && disposition.match(/filename\*=UTF-8''(.+)/);
            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "template.xlsx";

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSnackbar("Lista descărcată cu succes!", "success");
        } catch (error) {
            console.error("Eroare la descărcarea listei:", error);
            showSnackbar("Eroare la descărcarea listei. Te rugăm să încerci din nou.", "error");
        }
    };

    const uploadExcel = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadSuccess(false);
        setUploadError(null);
        setErrorDetails([]);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("authToken");
            const headers = token
                ? {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "multipart/form-data",
                  }
                : {
                      "Content-Type": "multipart/form-data",
                  };

            const response = await axios.post(`${API_URL}/competitii/${competitionId}/upload-participants/`, formData, { headers });

            setUploadSuccess(true);
            setFile(null);
            showSnackbar(`Sportivii au fost adăugați cu succes!`, "success");
        } catch (error) {
            console.error("Eroare la încărcarea fișierului:", error);

            let errorMessage = "Eroare la procesarea fișierului. Te rugăm să încerci din nou.";
            let errorList = [];

            if (error.response && error.response.data) {
                if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                }
                if (error.response.data.errors) {
                    errorList = error.response.data.errors;
                }
            }

            setUploadError(errorMessage);
            setErrorDetails(errorList);
            showSnackbar(errorMessage, "error");
        } finally {
            setIsUploading(false);
        }
    };

    //download excel rankings
    const downloadRankings = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/competitii/${competitionId}/ranking/download`, {
                responseType: "blob",
                headers,
            });
            const disposition = response.headers["content-disposition"];
            const filenameMatch = disposition && disposition.match(/filename\*=UTF-8''(.+)/);
            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "template.xlsx";

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSnackbar("Lista descărcată cu succes!", "success");
        } catch (error) {
            console.error("Eroare la descărcarea listei:", error);
            showSnackbar("Eroare la descărcarea listei. Te rugăm să încerci din nou.", "error");
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    return (
        <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
            <Typography variant="h4" align="center" sx={{ mb: 4 }}>
                Adaugă Sportivi din Excel
            </Typography>

            <Box sx={{ maxWidth: 650, mx: "auto", mb: 6 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Pentru a adăuga sportivi în competiție, vă rugăm să urmați acești pași:
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    1. Descărcați template-ul Excel folosind butonul de mai jos
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    2. Completați datele sportivilor în fișierul Excel descărcat
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    3. Încărcați fișierul completat folosind zona de încărcare de mai jos
                </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                <Button variant="contained" color="primary" startIcon={<FileDownloadIcon />} onClick={downloadTemplate} sx={{ px: 4, py: 1.5 }}>
                    Descarcă Template Excel
                </Button>
                <Button variant="outlined" color="primary" startIcon={<FileDownloadIcon />} onClick={downloadList} sx={{ ml: 2, px: 4, py: 1.5 }}>
                    Descarcă Lista Sportivilor
                </Button>
                <Button variant="outlined" color="primary" startIcon={<FileDownloadIcon />} onClick={downloadRankings} sx={{ ml: 2, px: 4, py: 1.5 }}>
                    Descarcă Clasamentul
                </Button>
            </Box>

            <Paper
                sx={{
                    maxWidth: 600,
                    mx: "auto",
                    p: 3,
                    border: "2px dashed",
                    borderColor: isDragging ? "primary.main" : "grey.400",
                    borderRadius: 2,
                    backgroundColor: isDragging ? "rgba(25, 118, 210, 0.04)" : "background.paper",
                    transition: "all 0.3s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                }}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleUploadClick}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: "none" }} />

                <CloudUploadIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />

                {file ? (
                    <Box sx={{ textAlign: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                            <InsertDriveFileIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6" color="primary">
                                {file.name}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                            Trage și plasează fișierul Excel aici
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            sau click pentru a selecta fișierul
                        </Typography>
                    </Box>
                )}
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Button variant="contained" color="success" onClick={uploadExcel} disabled={isUploading} sx={{ px: 4, py: 1.5 }}>
                    {isUploading ? (
                        <>
                            <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
                            Se procesează...
                        </>
                    ) : (
                        "Încarcă și Procesează"
                    )}
                </Button>
            </Box>

            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
                    {snackbarMessage}
                    {snackbarSeverity === "error" && errorDetails.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                                Erori detectate:
                            </Typography>
                            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                                {errorDetails.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </Box>
                    )}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Excel;
